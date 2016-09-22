import * as sinon from 'sinon';
import { buildSchema } from 'graphql';
import * as makeRequestModule from './make-request';
import { DirectiveArgument, Annotation } from '../index';
import { restAnnotationFactory } from './index';

const schema = buildSchema('type Query { foo: [String] }');
const makeRequestStub = sinon.stub(makeRequestModule, 'makeRequest');

describe('RestAnnotation', function () {
    beforeEach(() => {
        makeRequestStub.reset();
        makeRequestStub.returns(Promise.resolve('bar'));
    });

    after(() => makeRequestStub.restore());

    it('should throw when the type name is not present', function () {
        (() => createAnnotation(null, null, [])).should.throw(`Type name is required`);
    });

    it('should throw when the argument types are not valid', function () {
        (() => createAnnotation('foo', null, [{name: 'baseUrl', value: 42}])) .should.throw(`type: 'string'`);
        (() => createAnnotation('foo', null, [{name: 'url', value: 42}])) .should.throw(`type: 'string'`);
        (() => createAnnotation('foo', null, [{name: 'parameters', value: 42}])) .should.throw(`type: 'object'`);
        (() => createAnnotation('foo', null, [{name: 'method', value: 42}])) .should.throw(`type: 'string'`);
        (() => createAnnotation('foo', null, [{name: 'resultField', value: 42}])) .should.throw(`type: 'string'`);
        (() => createAnnotation('foo', null, [{name: 'basicAuthorization', value: 42}])) .should.throw(`type: 'string'`);
    });

    it('should extract the arguments when valid', function () {
        const restAnnotation: any = createAnnotation('foo', null, [
            {name: 'baseUrl', value: 'foo'},
            {name: 'url', value: 'bar'},
            {name: 'parameters', value: {parameter1: 'value1', parameter2: 'value2'}},
            {name: 'method', value: 'get'},
            {name: 'resultField', value: 'result'},
            {name: 'basicAuthorization', value: 'username:password'}
        ]);

        restAnnotation.annotationArguments.should.deep.equal({
                baseUrl: 'foo',
                url: 'bar',
                parameters: {parameter1: 'value1', parameter2: 'value2'},
                method: 'get',
                resultField: 'result',
                basicAuthorization: 'username:password'
            }
        );
    });

    it('should throw when a field is annotated and url argument is missing', function () {
        (() => createAnnotation('Query', 'foo', []).apply(schema, {}, {}, {})).should.throw(`'url' is required`);
    });

    it('should create a resolver for the field', () => {
        const rootValue: any = {};

        createAnnotation('Query', 'foo', [{name: 'url', value: 'baz'}]).apply(schema, {}, rootValue, {});

        rootValue.foo.should.be.a('function');
    });

    it('should make a request with default parameters and return the data', () => {
        const rootValue: any = {};

        createAnnotation('Query', 'foo', [{name: 'url', value: 'http://localhost:4000/foo'}]).apply(schema, {}, rootValue, {});

        return rootValue.foo({}, {}, {})
            .then(result => {
                makeRequestStub.calledOnce.should.be.true;
                makeRequestStub.args[0][0].should.deep.equal(withDefaults({url: 'http://localhost:4000/foo'}));

                return result;
            })
            .should.eventually.become('bar');
    });

    it('should make a request with default parameters and selected field of the data', () => {
        const restAnnotation = createAnnotation('Query', 'foo', [
            {name: 'url', value: 'http://localhost:4000/foo'},
            {name: 'resultField', value: 'baz'}
        ]);
        const rootValue: any = {};
        makeRequestStub.returns(Promise.resolve({baz: 'baz'}));

        restAnnotation.apply(schema, {}, rootValue, {});

        return rootValue.foo({}, {}, {}).should.eventually.become('baz');
    });

    it('should make a request with given defaults and return the data', () => {
        const restAnnotation1 = createAnnotation('Query', null, [
            {name: 'baseUrl', value: 'http://localhost:4000'},
            {name: 'basicAuthorization', value: 'user:pass'}
        ]);
        const restAnnotation2 = createAnnotation('Query', 'foo', [
            {name: 'url', value: 'foo'},
            {name: 'method', value: 'post'}
        ]);
        const rootValue: any = {};
        const contextValue: any = {};

        restAnnotation1.apply(schema, {}, rootValue, contextValue);
        restAnnotation2.apply(schema, {}, rootValue, contextValue);

        return rootValue.foo({}, {}, contextValue)
            .then(result => {
                makeRequestStub.calledOnce.should.be.true;
                makeRequestStub.args[0][0].should.deep.equal(withDefaults({
                    baseUrl: 'http://localhost:4000',
                    url: 'foo',
                    method: 'post',
                    headers: {
                        Authorization: 'Basic user:pass'
                    }
                }));

                return result;
            })
            .should.eventually.become('bar');
    });

    it('should ignore baseUrl when url is absolute', () => {
        const rootValue: any = {};
        const contextValue: any = {};

        createAnnotation('Query', null, [{name: 'baseUrl', value: 'http://localhost:4000'}]).apply(schema, {}, rootValue, contextValue);
        createAnnotation('Query', 'foo', [{name: 'url', value: 'http://localhost:5000/foo'}]).apply(schema, {}, rootValue, contextValue);

        return rootValue.foo({}, {}, contextValue)
            .then(() => {
                makeRequestStub.calledOnce.should.be.true;
                makeRequestStub.args[0][0].should.deep.equal(withDefaults({
                    url: 'http://localhost:5000/foo'
                }));
            });
    });

    it('should replace authorization variables with environment values and send it as header', () => {
        process.env.basicAuth = 'AUTH_HASH';
        const restAnnotation = createAnnotation('Query', 'foo', [
            {name: 'url', value: 'foo'},
            {name: 'basicAuthorization', value: '{{basicAuth}}'}
        ]);
        const rootValue: any = {};

        restAnnotation.apply(schema, {}, rootValue, {});

        return rootValue.foo({}, {}, {}) .then(result => makeRequestStub.args[0][0].headers.Authorization.should.equal('Basic AUTH_HASH'));
    });

    it('should support token based authentication', () => {
        process.env.tokenAuth = 'AUTH_TOKEN';
        const restAnnotation = createAnnotation('Query', 'foo', [
            {name: 'url', value: 'foo'},
            {name: 'tokenAuthorization', value: '{{tokenAuth}}'}
        ]);
        const rootValue: any = {};

        restAnnotation.apply(schema, {}, rootValue, {});

        return rootValue.foo({}, {}, {}) .then(result => makeRequestStub.args[0][0].headers.Authorization.should.equal('Token AUTH_TOKEN'));
    });

    it('should replace url parameter templates with arguments', () => {
        const restAnnotation = createAnnotation('Query', 'foo', [{name: 'url', value: 'http://localhost:4000/foo/{{param1}}/bar/{{param2}}'}]);
        const rootValue: any = {};

        restAnnotation.apply(schema, {}, rootValue, {});

        return rootValue.foo({}, {param1: 'value1', param2: 'value2'}, {})
            .then(result => makeRequestStub.args[0][0].url.should.equal('http://localhost:4000/foo/value1/bar/value2'));
    });

    it('should throw when there is no value for an url template', () => {
        const restAnnotation = createAnnotation('Query', 'foo', [{name: 'url', value: 'http://localhost:4000/{{foo}}'}]);
        const rootValue: any = {};

        restAnnotation.apply(schema, {}, rootValue, {});

        (() => rootValue.foo({}, {bar: 'baz'}, {})).should.throw(`'foo' not found`);
    });

    it('should pass all resolver arguments as url parameters when no parameters are selected', () => {
        const restAnnotation = createAnnotation('Query', 'foo', [{name: 'url', value: 'http://localhost:4000/foo'}]);
        const rootValue: any = {};

        restAnnotation.apply(schema, {}, rootValue, {});

        return rootValue.foo({}, {param1: 'value1', param2: 'value2'}, {})
            .then(result => makeRequestStub.args[0][0].should.deep.equal(withDefaults({
                url: 'http://localhost:4000/foo',
                parameters: {param1: 'value1', param2: 'value2'}
            })));
    });

    it('should pass only non-empty resolver arguments as parameters', () => {
        const restAnnotation = createAnnotation('Query', 'foo', [{name: 'url', value: 'http://localhost:4000/foo'}]);
        const rootValue: any = {};

        restAnnotation.apply(schema, {}, rootValue, {});

        return rootValue.foo({}, {param1: undefined, param2: 'value2'}, {})
            .then(result => makeRequestStub.args[0][0].should.deep.equal(withDefaults({
                url: 'http://localhost:4000/foo',
                parameters: {param2: 'value2'}
            })));
    });

    it('should use parameters as template replacement and pass remaining non-empty resolver arguments as parameters', () => {
        const restAnnotation = createAnnotation('Query', 'foo', [{name: 'url', value: 'http://localhost:4000/foo/{{param1}}'}]);
        const rootValue: any = {};

        restAnnotation.apply(schema, {}, rootValue, {});

        return rootValue.foo({}, {param1: 'bar', param2: undefined, param3: 'baz'}, {})
            .then(result => makeRequestStub.args[0][0].should.deep.equal(withDefaults({
                url: 'http://localhost:4000/foo/bar',
                parameters: {param3: 'baz'}
            })));
    });

    it('should make only one request if the request parameters are the same', () => {
        const directiveArguments = [
            {name: 'url', value: 'http://localhost:4000/foo'},
            {name: 'method', value: 'get'},
            {name: 'parameters', value: ['param1', 'param2']},
            {name: 'resultField', value: 'bar'}
        ];
        const rootValue: any = {};
        const contextValue: any = {};

        createAnnotation('Query', 'foo', directiveArguments).apply(schema, {}, rootValue, contextValue);
        createAnnotation('Query', 'bar', directiveArguments).apply(schema, {}, rootValue, contextValue);

        const promise1 = rootValue.foo({}, {}, contextValue);
        const promise2 = rootValue.bar({}, {}, contextValue);

        return Promise.all([promise1, promise2])
            .then(() => {
                makeRequestStub.calledOnce.should.be.true;
                makeRequestStub.args[0][0].should.deep.equal(withDefaults({
                    url: 'http://localhost:4000/foo',
                    resultField: 'bar'
                }));
            });
    });

    it('should make two requests if the request parameters are not the same', () => {
        const restAnnotation1 = createAnnotation('Query', 'foo', [
                {name: 'baseUrl', value: 'http://localhost:4000'},
                {name: 'url', value: 'foo'},
                {name: 'method', value: 'get'},
                {name: 'parameters', value: ['param1', 'param2']},
                {name: 'resultField', value: 'bar'}
            ]
        );
        const restAnnotation2 = createAnnotation('Query', 'bar', [
                {name: 'baseUrl', value: 'http://localhost:5000'},
                {name: 'url', value: 'bar'},
                {name: 'method', value: 'get'},
                {name: 'parameters', value: ['param1', 'param2']},
                {name: 'resultField', value: 'baz'}
            ]
        );
        const rootValue: any = {};
        const contextValue: any = {};

        restAnnotation1.apply(schema, {}, rootValue, contextValue);
        restAnnotation2.apply(schema, {}, rootValue, contextValue);

        const promise1 = rootValue.foo({}, {}, contextValue);
        const promise2 = rootValue.bar({}, {}, contextValue);

        return Promise.all([promise1, promise2])
            .then(() => {
                makeRequestStub.calledTwice.should.be.true;
                makeRequestStub.args[0][0].should.deep.equal(withDefaults({
                    baseUrl: 'http://localhost:4000',
                    url: 'foo',
                    resultField: 'bar'
                }));
                makeRequestStub.args[1][0].should.deep.equal(withDefaults({
                    baseUrl: 'http://localhost:5000',
                    url: 'bar',
                    resultField: 'baz'
                }));
            });
    });

    it('should support default custom headers with value resolution', () => {
        process.env.baz = 'Biz';
        const rootValue: any = {};
        const contextValue: any = {};

        createAnnotation('Query', null, [{name: 'customHeaders', value: ['Foo: Bar', 'Baz: {{baz}}']}]).apply(schema, {}, rootValue, contextValue);
        createAnnotation('Query', 'foo', [{name: 'url', value: 'foo'}]).apply(schema, {}, rootValue, contextValue);

        return rootValue.foo({}, {}, {}) .then(result => makeRequestStub.args[0][0].headers.should.deep.equal({
            'Foo': 'Bar',
            'Baz': 'Biz'
        }));
    });

    it('should support custom headers with value resolution', () => {
        process.env.baz = 'Biz';
        const restAnnotation = createAnnotation('Query', 'foo', [
            {name: 'url', value: 'foo'},
            {name: 'customHeaders', value: ['Foo: Bar', 'Baz: {{baz}}']}
        ]);
        const rootValue: any = {};

        restAnnotation.apply(schema, {}, rootValue, {});

        return rootValue.foo({}, {}, {}) .then(result => makeRequestStub.args[0][0].headers.should.deep.equal({
            'Foo': 'Bar',
            'Baz': 'Biz'
        }));
    });
});

function createAnnotation(typeName: string, fieldName: string, directiveArguments: Array<DirectiveArgument>): Annotation {
    const directiveInfo = {tag: 'rest', arguments: directiveArguments};

    return restAnnotationFactory(directiveInfo, typeName, fieldName);
}

function withDefaults(payload: any): Object {
    return Object.assign({}, {
        jar: true,
        json: true,
        method: payload.method || 'get',
        baseUrl: payload.baseUrl,
        url: payload.url,
        parameters: payload.parameters,
        headers: payload.headers,
        resultField: payload.resultField
    });
}
