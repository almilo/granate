import { GraphQLSchema, GraphQLFieldResolveFn } from 'graphql';
import { invariant, getOrCreate } from '../../lib';
import { extractArguments, ArgumentDescriptors } from '../lib';
import { AnnotationFactory, Annotation, DirectiveInfo } from '../index';
import { makeRequest, Request } from './make-request';
import DataLoader = require('dataloader');

type RequestDefaults = {
    json: boolean,
    jar: boolean,
    baseUrl?: string,
    method: string,
    headers: Object
};

type AnnotationArguments =  {
    baseUrl?: string,
    url?: string,
    parameters?: Array<string>,
    method?: string,
    resultField?: string,
    basicAuthorization?: string
};

/**
 * Adds a resolver function to a field which performs a REST request
 *
 * Examples:
 *
 * - Basic usage
 *
 * type Query {
 *     todos: [Todos] @rest(url: "https://todos.com/todos")
 * }
 *
 * { todos {id title} } translates into the request: "GET https://todos.com/todos"
 *
 * - Automatic query parameter mapping as request parameters
 *
 * type Query {
 *     todos(completed: Boolean, max: Int): [Todos] @rest(url: "https://todos.com/todos")
 * }
 *
 * { todos(q: true, max: 10) {id title} } translates into the request: "GET https://todos.com/todos?q=true&max=10"
 *
 * - POST support with automatic query parameter mapping as request parameters
 *
 * type Query {
 *     todos(completed: Boolean, max: Int): [Todos] @rest(url: "https://todos.com/todos")
 * }
 *
 * { todos(q: true, max: 10) {id title} } translates into the request: "POST https://todos.com/todos {q: true, max: 10}"
 *
 * - Result field selection
 *
 * type Query {
 *     todos: [Todos] @rest(url: "https://todos.com/todos", resultField: "items")
 * }
 *
 * { todos {id title} } translates into the request: "GET https://todos.com/todos" and selects the "items" field from the JSON response
 *
 * - Base URL as default value (type or field level)
 *
 * type Query @rest(baseUrl: "https://todos.com") {
 *     todos: [Todos] @rest(url: "todos")
 * }
 *
 * { todos {id title} } translates into the request: "GET https://todos.com/todos"
 *
 * - Authorization support as default value (type or field level)
 *
 * type Query @rest(basicAuthorization: "123abc456def") {
 *     todos: [Todos] @rest(url: "https://todos.com/todos")
 * }
 *
 * { todos {id title} } translates into the request: "GET https://todos.com/todos" with 'Authentication': 'Basic 123abc456def' header
 *
 * - Authorization support with environment variable resolution (type or field level)
 *
 * type Query @rest(basicAuthorization: "{{auth}}") {
 *     todos: [Todos] @rest(url: "https://todos.com/todos")
 * }
 *
 * given an environment variable 'auth' with value '123abc456def' translates { todos {id title} } into the request:
 * "GET https://todos.com/todos" with 'Authentication': 'Basic 123abc456def' header
 *
 * - Query parameter to URL parameter mapping
 *
 * type Query {
 *     todos(param1: String, param2: String): [Todos] @rest(url: "https://todos.com/todos/{{param1}}/{{param2}}")
 * }
 *
 * { todos(param1: 'value1', param2: 'value2') {id title} } translates into the request: "GET https://todos.com/todos/value1/value2"
 *
 * - Query parameter to URL parameter mapping with automatic mapping of remaining parameters as request parameters
 *
 * type Query {
 *     todos(param1: String, param2: String): [Todos] @rest(url: "https://todos.com/todos/{{param1}}")
 * }
 *
 * { todos(param1: 'value1', param2: 'value2') {id title} } translates into the request: "GET https://todos.com/todos/value1?param2=value2"
 *
 * - Query parameter selection
 *
 * type Query {
 *     todos(param1: String, param2: String): [Todos] @rest(url: "https://todos.com/todos", params: ["param2"])
 * }
 *
 * { todos(param1: 'value1', param2: 'value2') {id title} } translates into the request: "GET https://todos.com/todos/value1?param2=value2"
 *
 */
class RestAnnotation {
    constructor(private typeName: string, private fieldName?: string, private annotationArguments: AnnotationArguments = {}) {
    }

    apply(schema: GraphQLSchema, mocks: Object, rootValue: Object, contextValue: Object): void {
        const requestDefaults: RequestDefaults = <RequestDefaults>getOrCreate(contextValue, '_requestDefaults');
        const requestDefaultsByType: RequestDefaults = <RequestDefaults>getOrCreate(requestDefaults, this.typeName, getRequestDefaultsInitialValues());

        applyToRequestDefaults(
            requestDefaultsByType,
            this.annotationArguments.baseUrl,
            this.annotationArguments.basicAuthorization
        );

        if (this.fieldName) {
            invariant(schema.getType(this.typeName) === schema.getQueryType(), 'Only annotation of query fields is supported.');

            rootValue[this.fieldName] = createResolver(requestDefaultsByType, this.annotationArguments);
        }
    }
}

const ANNOTATION_TAG = 'rest';

const anyRestAnnotationFactory: any = function (directiveInfo: DirectiveInfo, typeName: string, fieldName?: string): Annotation {
    invariant(typeName && typeName !== '', `Type name is required in '${ANNOTATION_TAG}' annotation.`);

    const argumentDescriptors: ArgumentDescriptors = {
        baseUrl: {type: 'string'},
        url: {type: 'string'},
        parameters: {type: 'object'},
        method: {type: 'string'},
        resultField: {type: 'string'},
        basicAuthorization: {type: 'string'}
    };
    const annotationArguments = extractArguments(ANNOTATION_TAG, directiveInfo.arguments, argumentDescriptors);

    return new RestAnnotation(typeName, fieldName, annotationArguments);
};

anyRestAnnotationFactory.TAG = ANNOTATION_TAG;

export const restAnnotationFactory: AnnotationFactory = anyRestAnnotationFactory;

function applyToRequestDefaults(requestDefaults: RequestDefaults,
                                baseUrl?: string,
                                basicAuthorization?: string): void {
    if (baseUrl) {
        requestDefaults.baseUrl = baseUrl;
    }

    if (basicAuthorization) {
        const basicAuthorizationValue = getValue(basicAuthorization, process.env);

        requestDefaults.headers['Authorization'] = `Basic ${basicAuthorizationValue}`;
    }
}

function createResolver(requestDefaults: RequestDefaults, annotationArguments: AnnotationArguments): GraphQLFieldResolveFn {
    invariant(typeof annotationArguments.url === 'string', `Annotation argument: 'url' is required when annotating a field.`);

    return (source, args, context) => {
        // use the parameters to substitute the url templates and keep the remaining parameters
        const {url, parameters} = replaceUrlTemplates(annotationArguments.url, annotationArguments.parameters, args);
        const request: Request = {
            jar: requestDefaults.jar,
            json: requestDefaults.json,
            method: annotationArguments.method || requestDefaults.method,
            baseUrl: annotationArguments.baseUrl || requestDefaults.baseUrl,
            url,
            parameters,
            headers: requestDefaults.headers,
            resultField: annotationArguments.resultField
        };

        return getDataLoader(context).load(request);
    };
}

function getDataLoader(contextValue?: {_restDataLoader: DataLoader<Request, Object>}): DataLoader<Request, Object> {
    let restDataLoader = contextValue._restDataLoader;

    if (!restDataLoader) {
        restDataLoader = new DataLoader<Request, Object>(
            requests => Promise.all(requests.map(makeRequestAndSelectResult)),
            {cacheKeyFn: serializeRequestKey}
        );

        contextValue._restDataLoader = restDataLoader;
    }

    return restDataLoader;

    function makeRequestAndSelectResult(request: Request) {
        const resultField = request.resultField;

        return makeRequest(request).then(body => resultField ? body[resultField] : body);
    }

    function serializeRequestKey({method, baseUrl, url, parameters, resultField}: Request): string {
        const serializedParameters = Object.keys(parameters)
            .map(parameterName => `${parameterName}=${parameters[parameterName]}`)
            .join(':');

        return `${method}:${baseUrl}:${url}:${serializedParameters}:${resultField}`;
    }
}

function filterUndefinedValues(valueSource: {[key: string]: any}, valueNames: Array<string>) {
    return valueNames.reduce(filterEmptyValue, {});

    function filterEmptyValue(nonEmptyValues: {[key: string]: any}, valueName: string) {
        const value = valueSource[valueName];

        if (value !== undefined) {
            nonEmptyValues[valueName] = value;
        }

        return nonEmptyValues;
    }
}

function replaceUrlTemplates(url: string, parameters: Array<string>, valuesSource: {}) {
    const nonEmptyValues = filterUndefinedValues(valuesSource, parameters || Object.keys(valuesSource));

    return {
        url: url.replace(/(\{\{(.*?)\}\})/g, createArgumentReplacer(nonEmptyValues)),
        parameters: nonEmptyValues
    };

    function createArgumentReplacer(args: {[key: string]: any}) {
        return (match: string, argumentTemplate: string, argumentName: string) => {
            const argument = args[argumentName];

            invariant(argument !== undefined, `Replacement value for url argument: '${argumentName}' not found.`);

            delete args[argumentName];

            return argument;
        };
    }
}

function getValue(valueOrVariableName: string, context: {}): string {
    const envVariableName: string = (valueOrVariableName.match(/\{\{(.*?)\}\}/) || [])[1];

    return envVariableName ? context[envVariableName] : valueOrVariableName;
}

function getRequestDefaultsInitialValues() {
    return {
        json: true,
        jar: true,
        method: 'get',
        headers: {'User-Agent': 'granate'}
    };
}
