import * as sinon from 'sinon';
import { GraphQLSchema, graphql } from 'graphql';
import { granate, buildSchema } from './index';

const fooSchema = 'type Query { foo: String }';

describe('Granate', function () {
    describe('granate()', function () {
        beforeEach(function () {
            this.sinon = sinon.sandbox.create();
        });

        afterEach(function () {
            this.sinon.restore();
        });

        it('should throw an exception when the schema is not valid', function () {
            (() => granate(null, 'foo')).should.throw('Schema must be either');
            (() => granate('', 'foo')).should.throw('Schema must be either');
            (() => granate('type Foo {}', 'foo')).should.throw('with query type or a type named Query');
            (() => granate('type Query {}', 'foo')).should.throw('Query fields must be an object with field names');
        });

        it('should throw an exception when the query is not valid', function () {
            (() => granate(fooSchema, null)).should.throw('non empty string');
            (() => granate(fooSchema, '')).should.throw('non empty string');
        });

        it('should return a promise with an error message', function () {
            return granate(fooSchema, '{ bar }').then(errorMessage).should.eventually.contain('Cannot query field "bar"');
        });

        it('should return a promise that evaluates to mock data when the schema is valid text and the query is valid', function () {
            return granate(fooSchema, '{ foo }').should.eventually.deep.equal(data({foo: 'Hello World'}));
        });

        it('should return a promise that evaluates to mock data when the schema is a schema instance and the query is valid', function () {
            return granate(buildSchema(fooSchema), '{ foo }').should.eventually.deep.equal(data({foo: 'Hello World'}));
        });

        it('should return a promise that evaluates to root value data when a root value is passed', function () {
            const rootValue = {
                foo() {
                    return 'bar';
                }
            };

            return granate(fooSchema, '{ foo }', rootValue).should.eventually.deep.equal(data({foo: 'bar'}));
        });

        it('should return a promise that evaluates to context data when a root value and context are passed', function () {
            const contextValue = {
                data: 'baz'
            };
            const rootValue = {
                foo: (sourceObject: any, params: any, context: {data: string}) => context.data
            };

            return granate(fooSchema, '{ foo }', rootValue, contextValue).should.eventually.deep.equal(data({foo: 'baz'}));
        });

        it('should return a promise that evaluates to custom mock data when mocks are passed', function () {
            const mocks = {
                Query: () => ({
                    foo: () => 'bar'
                })
            };

            return granate(fooSchema, '{ foo }', undefined, undefined, undefined, mocks).should.eventually.deep.equal(data({foo: 'bar'}));
        });

        it('should show a warning and return a promise that does not evaluate to custom mock data when schema instance and mocks are passed together', function () {
            const warnStub = this.sinon.stub(console, 'warn');
            const mocks = {
                Query: () => ({
                    foo: () => 'bar'
                })
            };

            return granate(buildSchema(fooSchema), '{ foo }', undefined, undefined, undefined, mocks)
                .then(result => {
                    warnStub.calledWithMatch('Mocks will be ignored').should.be.true;
                    result.should.deep.equal(data({foo: 'Hello World'}));
                });
        });
    });

    describe('buildSchema()', function () {
        it('should throw an exception when the schema is not valid', function () {
            (() => buildSchema(null)).should.throw('of null');
            (() => buildSchema('')).should.throw('Syntax Error GraphQL');
            (() => buildSchema('type Foo {}')).should.throw('with query type or a type named Query');
            (() => buildSchema('type Query {}')).should.throw('Query fields must be an object with field names');
        });

        it('should return an executable GraphQL schema with default mock data', function () {
            const schema = buildSchema(fooSchema);

            schema.should.be.instanceof(GraphQLSchema);
            return graphql(schema, '{ foo }').should.eventually.deep.equal(data({foo: 'Hello World'}));
        });

        it('should return an executable GraphQL schema with custom mock data', function () {
            const mocks = {
                Query: () => ({
                    foo: () => 'bar'
                })
            };
            const schema = buildSchema(fooSchema, mocks);

            schema.should.be.instanceof(GraphQLSchema);
            return graphql(schema, '{ foo }').should.eventually.deep.equal(data({foo: 'bar'}));
        });
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
