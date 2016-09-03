import { granate, buildSchema } from './index';
import { GraphQLSchema } from 'graphql';

const fooSchema = `type Query { foo: String }`;

describe('Granate', function () {
    describe('granate()', function () {
        it('should throw an exception when the schema is not valid', function () {
            (() => granate(null, 'foo')).should.throw('of null');
            (() => granate('', 'foo')).should.throw('Syntax Error GraphQL');
            (() => granate('type Foo {}', 'foo')).should.throw('with query type or a type named Query');
            (() => granate('type Query {}', 'foo')).should.throw('Query fields must be an object with field names');
        });

        it('should throw an exception when the query is not valid', function () {
            (() => granate(fooSchema, null)).should.throw('non empty string');
            (() => granate(fooSchema, '')).should.throw('non empty string');
        });

        it('should return a promise with an error message', function () {
            return granate(fooSchema, `{ bar }`).then(errorMessage).should.eventually.contain('Cannot query field "bar"');
        });

        it('should return a promise that evaluates to mock data when the schema and the query are valid', function () {
            return granate(fooSchema, `{ foo }`).should.eventually.deep.equal(data({foo: 'Hello World'}));
        });
    });

    describe('buildSchema()', function () {
        it('should throw an exception when the schema is not valid', function () {
            (() => buildSchema(null)).should.throw('of null');
            (() => buildSchema('')).should.throw('Syntax Error GraphQL');
            (() => buildSchema('type Foo {}')).should.throw('with query type or a type named Query');
            (() => buildSchema('type Query {}')).should.throw('Query fields must be an object with field names');
        });

        it('should return a GraphQL schema', function () {
            return buildSchema(fooSchema).should.be.instanceof(GraphQLSchema);
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
