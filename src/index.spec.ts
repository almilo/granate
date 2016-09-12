import { GraphQLSchema, graphql } from 'graphql';
import { granate, Mocks } from './index';
import { AnnotationFactory, DirectiveInfo } from './annotations/index';

const fooSchema = 'type Query { foo: String }';

describe('granate()', function () {
    it('should throw an exception when the schema is not valid', function () {
        (() => granate(null, 'foo')).should.throw('Schema must be a non-empty string');
        (() => granate('', 'foo')).should.throw('Schema must be a non-empty string');
        (() => granate('type Foo {}', 'foo')).should.throw('with query type or a type named Query');
        (() => granate('type Query {}', 'foo')).should.throw('Query fields must be an object with field names');
    });

    it('should return a promise with an error message', function () {
        return granate(fooSchema, '{ bar }').then(errorMessage).should.eventually.contain('Cannot query field "bar"');
    });

    it('should return a promise that evaluates to mock data when the schema is valid text and the query is valid', function () {
        return granate(fooSchema, '{ foo }').should.eventually.deep.equal(data({foo: 'Hello World'}));
    });

    it('should return a promise that evaluates to root value data when a root value is passed', function () {
        const rootValue = {
            foo() {
                return 'bar';
            }
        };

        return granate(fooSchema, '{ foo }', undefined, {rootValue}).should.eventually.deep.equal(data({foo: 'bar'}));
    });

    it('should return a promise that evaluates to context data when a root value and context are passed', function () {
        const contextValue = {
            data: 'baz'
        };
        const rootValue = {
            foo: (sourceObject: any, params: any, context: {data: string}) => context.data
        };

        return granate(fooSchema, '{ foo }', undefined, {
            rootValue,
            contextValue
        }).should.eventually.deep.equal(data({foo: 'baz'}));
    });

    it('should return a promise that evaluates to custom mock data when mocks are passed', function () {
        const mocks: Mocks = {
            Query: () => ({
                foo: () => 'bar'
            })
        };

        return granate(fooSchema, '{ foo }', undefined, {mocks}).should.eventually.deep.equal(data({foo: 'bar'}));
    });

    it('should apply annotations', function () {
        const annotationFactory = createAnnotationFactory('baz');
        const annotatedFooSchema = 'type Query { foo: String  @baz}';

        return granate(annotatedFooSchema, '{ foo }', undefined, {annotationFactories: [annotationFactory]})
            .should.eventually.deep.equal(data({foo: 'baz'}));
    });
});

function data(payload: Object) {
    return {
        data: payload
    };
}

function errorMessage(payload: {errors: Array<{message: string}>}): string {
    return payload.errors[0].message;
}

function createAnnotationFactory(tag: string): AnnotationFactory {
    const annotationFactory: any = (directiveInfo: DirectiveInfo, typeName: string, fieldName: string) => {
        return {
            apply(schema: GraphQLSchema, mocks: Object): void {
                mocks[typeName] = () => ({
                    [fieldName]: () => tag
                });
            }
        }
    };
    annotationFactory.TAG = tag;

    return annotationFactory;
}
