import { DirectiveArgument } from '../annotations/index';
import { invariant } from '../lib/index';

export type ArgumentDescriptor = {
    required?: boolean,
    type?: string
}

export type ArgumentDescriptors = {[key: string]: ArgumentDescriptor};

export function extractArguments(tag: string,
                                 args: Array<DirectiveArgument>,
                                 argumentDescriptors: ArgumentDescriptors): {[key: string]: any} {
    return Object.keys(argumentDescriptors).reduce(extractArgument, {});

    function extractArgument(extractedArguments: {[key: string]: any}, argumentName: string) {
        const argumentDescriptor = argumentDescriptors[argumentName];
        const extractedArgument = args.find(argument => argument.name === argumentName);

        invariant(argumentDescriptor.type, `Argument descriptor is required.`);

        invariant(
            !argumentDescriptor.required || extractedArgument,
            `Missing required argument: '${argumentName}' in '${tag}' annotation.`
        );

        if (extractedArgument) {
            invariant(
                argumentDescriptor.type === 'any' || typeof extractedArgument.value === argumentDescriptor.type,
                `Argument '${argumentName}' should be of type: '${argumentDescriptor.type}' but it is of type '${typeof extractedArgument.value}' in '${tag}' annotation.`
            );

            extractedArguments[argumentName] = extractedArgument.value;
        }

        return extractedArguments;
    }
}
