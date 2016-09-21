import * as request from 'request';
import { IncomingMessage } from 'http';

export type Request = {
    jar: boolean,
    json: boolean,
    method: string,
    baseUrl?: string,
    url: string,
    parameters: Object,
    headers: Object,
    resultField?: string
};

/* istanbul ignore next */
export function makeRequest({jar, json, method, baseUrl, url, parameters, headers}: Request): Promise<any> {
    const parametersPropertyName = method === 'get' ? 'qs' : 'body';
    const requestArguments = {jar, json, method, baseUrl, url, [parametersPropertyName]: parameters, headers};

    return new Promise((resolve, reject) => {
        request(requestArguments, callback);

        function callback(error: string, response: IncomingMessage, body: string) {
            if (error || response.statusCode !== 200) {
                reject(error || response.statusMessage);
            } else {
                resolve(body);
            }
        }
    });
}
