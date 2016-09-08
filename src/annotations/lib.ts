import { DirectiveArgument } from '../annotations/index';
import { invariant } from '../lib/index';

export function findArgument(tag: string,
                             name: string,
                             args: Array<DirectiveArgument>,
                             required: boolean): DirectiveArgument {
    const argument = args.find(argument => argument.name === name);

    invariant(!required || argument, `Missing required argument: '${name}' in '${tag}' annotation.`);

    return argument;
}

export function createFieldMock(fieldName: string, value: any) {
    return () => ({
        [fieldName]: createMock(value)
    });
}

export function createMock(value: any) {
    return () => value;
}
