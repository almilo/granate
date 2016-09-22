import { parse, visit, Document } from 'graphql';
import { invariant } from '../lib/index';
import { AnnotationFactory, DirectiveArgument, DirectiveInfo, Annotation } from './index';

interface ASTNode {
    kind: string,
    name: {
        value: string
    },
    value: any,
    values: Array<ASTNode>,
    directives: Array<ASTNode>,
    arguments: Array<ASTNode>
}

type DirectiveContext = {
    directiveNode: ASTNode,
    targetNode: ASTNode,
    ancestorNodes: Array<ASTNode>
};

type AnnotationFactoryMap = {[key: string]: AnnotationFactory};

/**
 * Given a list of annotation factories, parses a GraphQL schema text and returns a list of the recognised annotations
 */
export class AnnotationExtractor {
    private annotationFactories: AnnotationFactoryMap;

    constructor(annotationFactories: Array<AnnotationFactory>) {
        invariant(Array.isArray(annotationFactories), 'Annotation factories must be an array.');

        this.annotationFactories = annotationFactories.reduce(asObjectProperty, <AnnotationFactoryMap>{});

        function asObjectProperty(annotationFactoriesByTag: AnnotationFactoryMap, annotationFactory: AnnotationFactory) {
            annotationFactoriesByTag[annotationFactory.TAG] = annotationFactory;

            return annotationFactoriesByTag;
        }
    }

    /**
     * Parses a given schema text or AST and returns the annotations extracted by the annotation factories
     *
     * @param schema the GraphQL schema in text or AST form (Document)
     * @returns a list with the recognised schema annotations
     */
    parse(schema: string | Document): Array<Annotation> {
        const schemaAst = typeof schema === 'string' ? parse(schema) : schema;

        return extractDirectiveContexts(schemaAst)
            .reduce(applyAnnotationFactories(this.annotationFactories), []);

        function extractDirectiveContexts(schemaAst: Document): Array<DirectiveContext> {
            const directiveContexts: Array<DirectiveContext> = [];

            visit(schemaAst, createExtractDirectiveContextsVisitor(directiveContexts), undefined);

            return directiveContexts;

            function createExtractDirectiveContextsVisitor(directiveContexts: Array<DirectiveContext>) {
                return {
                    enter(targetNode: ASTNode, key: any, parent: any, path: any, ancestors: Array<ASTNode>) {
                        if (targetNode.directives) {
                            targetNode.directives.forEach(extractDirectiveContext);
                        }

                        function extractDirectiveContext(directiveNode: ASTNode): void {
                            directiveContexts.push({
                                directiveNode,
                                targetNode,
                                ancestorNodes: Array.from(ancestors).reverse()
                            });
                        }
                    }
                };
            }
        }

        function applyAnnotationFactories(annotationFactories: AnnotationFactoryMap) {
            return (annotations: Array<Annotation>, directiveContext: DirectiveContext): Array<Annotation> => {
                const annotationType = directiveContext.directiveNode.name.value;
                const annotationFactory = annotationFactories[annotationType];

                if (annotationFactory) {
                    const directiveInfo = extractDirectiveInfo(directiveContext.directiveNode);
                    const {typeName, fieldName} = extractTypeAndFieldNames(
                        directiveContext.ancestorNodes,
                        directiveContext.targetNode
                    );
                    const annotation = annotationFactory(directiveInfo, typeName, fieldName);

                    if (annotation) {
                        annotations.push(annotation);
                    }
                }

                return annotations;

                function extractDirectiveInfo(directiveNode: ASTNode): DirectiveInfo {
                    return {
                        tag: directiveNode.name.value,
                        arguments: directiveNode.arguments.map(parseArgument)
                    };
                }

                function extractTypeAndFieldNames(ancestorNodes: Array<ASTNode>, targetNode: ASTNode): {typeName: string, fieldName: string} {
                    const fieldName = targetNode.kind === 'FieldDefinition' ? targetNode.name.value : undefined;
                    const typeNode = fieldName ? findTypeNode(ancestorNodes) : targetNode;
                    const typeName = typeNode.name.value;

                    return {typeName, fieldName};

                    function findTypeNode(ancestorNodes: Array<ASTNode>) {
                        return ancestorNodes.find(ancestorNode => ancestorNode.kind.endsWith('TypeDefinition'));
                    }
                }
            }
        }
    }
}

/**
 * Function which, given a GraphQL argument value, returns a JS value or throws an exception if there is no converter
 * for it
 *
 * @param argumentNode AST node with a GraphQL argument value which should be transformed into the corresponding JS value
 * @returns an object with name and value
 */
function parseArgument(argumentNode: ASTNode): DirectiveArgument {
    return {
        name: argumentNode.name.value,
        value: toJSValue(argumentNode.value)
    };
}

/**
 * Map with the converters supported to convert a GraphQL value to a JS value
 */
const converters = {
    StringValue: (value: ASTNode) => value.value,
    BooleanValue: (value: ASTNode) => value.value,
    IntValue: (value: ASTNode) => parseInt(value.value),
    FloatValue: (value: ASTNode) => parseFloat(value.value),
    ListValue: listValue
};

function toJSValue(value: ASTNode): any {
    const converter = converters[value.kind];

    if (!converter) {
        throw new Error(`Conversion for values of type: '${value.kind}' not supported.`);
    }

    return converter(value);
}

function listValue(value: ASTNode): Array<any> {
    return value.values.reduce(convertValue, []);

    function convertValue(convertedValues: Array<any>, currentValue: ASTNode) {
        convertedValues.push(toJSValue(currentValue));

        return convertedValues;
    }
}
