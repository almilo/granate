export function invariant(value: any, message: string) {
    if (!value) {
        throw new Error(message);
    }
}

export function getOrCreate(containerObject: Object, propertyName: string, initialValues?: Object): Object {
    let propertyValue = containerObject[propertyName];

    if (!(propertyValue instanceof Object)) {
        propertyValue = containerObject[propertyName] = initialValues ? Object.assign({}, initialValues) : {};
    }

    return propertyValue;
}
