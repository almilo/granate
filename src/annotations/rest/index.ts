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
    basicAuthorization?: string,
    tokenAuthorization?: string
};

/**
 *
 * Adds a resolver function to a field which performs a REST request
 *
 * For usage examples see the README.md file
 *
 */
class RestAnnotation {
    constructor(private typeName: string, private fieldName?: string, private annotationArguments: AnnotationArguments = {}) {
    }

    apply(schema: GraphQLSchema, mocks: Object, rootValue: Object, contextValue: Object): void {
        const requestDefaults: RequestDefaults = <RequestDefaults>getOrCreate(contextValue, '_requestDefaults');
        const requestDefaultsByType: RequestDefaults = <RequestDefaults>getOrCreate(requestDefaults, this.typeName, getRequestDefaultsInitialValues());
        const authorization = this.annotationArguments.basicAuthorization || this.annotationArguments.tokenAuthorization;
        const authorizationType = this.annotationArguments.basicAuthorization ?
            'Basic' :
            this.annotationArguments.tokenAuthorization ?
                'Token' :
                undefined;

        applyToRequestDefaults(requestDefaultsByType, this.annotationArguments.baseUrl, authorization, authorizationType);

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
        basicAuthorization: {type: 'string'},
        tokenAuthorization: {type: 'string'}
    };
    const annotationArguments = extractArguments(ANNOTATION_TAG, directiveInfo.arguments, argumentDescriptors);

    return new RestAnnotation(typeName, fieldName, annotationArguments);
};

anyRestAnnotationFactory.TAG = ANNOTATION_TAG;

export const restAnnotationFactory: AnnotationFactory = anyRestAnnotationFactory;

function applyToRequestDefaults(requestDefaults: RequestDefaults, baseUrl?: string, authorization?: string, authorizationType?: string): void {
    if (baseUrl) {
        requestDefaults.baseUrl = baseUrl;
    }

    if (authorization) {
        const authorizationValue = getValue(authorization, process.env);

        requestDefaults.headers['Authorization'] = `${authorizationType} ${authorizationValue}`;
    }
}

function createResolver(requestDefaults: RequestDefaults, annotationArguments: AnnotationArguments): GraphQLFieldResolveFn {
    invariant(typeof annotationArguments.url === 'string', `Annotation argument: 'url' is required when annotating a field.`);

    return (source, args, context) => {
        // use the parameters to substitute the url templates and keep the remaining parameters
        const {url, parameters} = replaceUrlTemplates(annotationArguments.url, annotationArguments.parameters, args);
        const isAbsoluteUrl = url.match(/^(.*):\/\//);
        const request: Request = {
            jar: requestDefaults.jar,
            json: requestDefaults.json,
            method: annotationArguments.method || requestDefaults.method,
            baseUrl: !isAbsoluteUrl ? annotationArguments.baseUrl || requestDefaults.baseUrl : undefined,
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
