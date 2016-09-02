export function invariant(value: any, message: string) {
    if (!value) {
        throw new Error(message);
    }
}
