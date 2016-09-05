import { DirectiveInfo, AnnotationFactory } from './index';
import { AnnotationExtractor } from './annotation-extractor';
import { parse } from 'graphql';

const annotationExtractor = new AnnotationExtractor([
    createAnnotationFactory('bar'),
    createAnnotationFactory('baz'),
    createAnnotationFactory('bam', true)
]);

describe('AnnotationExtractor', function () {
    it('should return no annotations when no annotations are present', function () {
        const schema = `
            type Query {
                foo: String
            }
        `;

        const schemaAnnotations = annotationExtractor.parse(schema);

        schemaAnnotations.should.deep.equal([]);
    });

    it('should return no annotations when no annotations are matched', function () {
        const schema = `
            type Query {
                foo: String @foo
            }
        `;

        const schemaAnnotations = annotationExtractor.parse(schema);

        schemaAnnotations.should.deep.equal([]);
    });

    it('should return the annotations when the annotations match', function () {
        let schema = `
            type Query {
                foo: String @bar( string: "hello world!", int: 42, float: 32.5, boolean: true )
            }
        `;

        let schemaAnnotations = annotationExtractor.parse(schema);

        schemaAnnotations.should.deep.equal([{
            typeName: 'Query',
            fieldName: 'foo',
            tag: 'bar',
            arguments: [
                {name: 'string', value: 'hello world!'},
                {name: 'int', value: 42},
                {name: 'float', value: 32.5},
                {name: 'boolean', value: true}
            ]
        }]);

        schema = `
            type Query {
                foo: String
                @bar
            }
        `;

        schemaAnnotations = annotationExtractor.parse(schema);

        schemaAnnotations.should.deep.equal([{
            typeName: 'Query',
            fieldName: 'foo',
            tag: 'bar',
            arguments: []
        }]);

        schema = `
            type Query @bar {
                foo: String
            }
        `;

        schemaAnnotations = annotationExtractor.parse(schema);

        schemaAnnotations.should.deep.equal([{
            typeName: 'Query',
            fieldName: undefined,
            tag: 'bar',
            arguments: []
        }]);

        schema = `
            type Query {
                foo(id: Int): String
                @bar( foo: "baz" )
            }
        `;

        schemaAnnotations = annotationExtractor.parse(schema);

        schemaAnnotations.should.deep.equal([{
            typeName: 'Query',
            fieldName: 'foo',
            tag: 'bar',
            arguments: [{name: 'foo', value: 'baz'}]
        }]);

        schema = `
            type Query {
                foo(id: Int): String
                @bar( foo: "baz" )
                @baz( baz: "foo" )
            }
        `;

        schemaAnnotations = annotationExtractor.parse(schema);

        schemaAnnotations.should.deep.equal([
            {
                typeName: 'Query',
                fieldName: 'foo',
                tag: 'bar',
                arguments: [{name: 'foo', value: 'baz'}]
            },
            {
                typeName: 'Query',
                fieldName: 'foo',
                tag: 'baz',
                arguments: [{name: 'baz', value: 'foo'}]
            }
        ]);
    });

    it('should support annotation factories not returning anything', function () {
        const schema = `
            type Query {
                foo: String @bam
            }
        `;

        let schemaAnnotations = annotationExtractor.parse(schema);

        schemaAnnotations.should.deep.equal([]);
   });

    it('should support passing a schema as AST', function () {
        const schema = `
            type Query {
                foo: String @bar
            }
        `;

        const schemaAst = parse(schema);
        const schemaAnnotations = annotationExtractor.parse(schemaAst);

        schemaAnnotations.should.deep.equal([{
            typeName: 'Query',
            fieldName: 'foo',
            tag: 'bar',
            arguments: []
        }]);
    });

    it('should throw when the argument type of an annotation is not supported', function () {
        const schema = `
            enum Arg { NOT_SUPPORTED }
            
            type Query {
                foo: String @bar(baz: NOT_SUPPORTED)  
            }
        `;

        (() => annotationExtractor.parse(schema)).should.throw('not supported');
    });
});

function createAnnotationFactory(tag: string, emptyResult: boolean = false): AnnotationFactory {
    const annotationFactory: any = (directiveInfo: DirectiveInfo, typeName: string, fieldName: string) => {
        return !emptyResult && Object.assign({ typeName, fieldName}, directiveInfo);
    };
    annotationFactory.TAG = tag;

    return annotationFactory;
}
