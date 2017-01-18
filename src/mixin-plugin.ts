import 'reflect-metadata';
import {Schema} from 'mongoose';

let excludeStatics = ['length', 'name', 'prototype'];
let excludeMethods = ['constructor'];

/**
 * Used to annotate properties that should be ignored.
 * @param {any}    obj         Schema object
 * @param {string} propertyKey property name
 */
function shouldIgnore(obj: any, propertyKey: string) {
    return propertyKey.startsWith('_$_') ||
        !!Reflect.getMetadata('schema:ignore', obj, propertyKey) as boolean;
}

interface PropertyInfo {
    getter?: Function;
    name: string;
    setter?: Function;
}

/**
 * Convienience method for conditional logging.
 * @param {string}  msg
 * @param {boolean} debug [description]
 */
function log(msg: string, debug: boolean) {
    if (debug) { console.log(msg); }
}

/**
 * Marks up the object for mongoose compatibility
 * @param {Schema}     schema  the schema object
 * @param {any}        options schema options
 * @param {boolean =       false}       debug
 */
export function MixinPlugin(schema:Schema, options:any, debug: boolean = false) {
    let statics = Object.getOwnPropertyNames(options);
    let methods = Object.getOwnPropertyNames(options.prototype);
    let properties: PropertyInfo[] = methods.map<PropertyInfo>((prop) => {
        let info = {
            getter: options.prototype.__lookupGetter__(prop),
            name: prop,
            setter: options.prototype.__lookupSetter__(prop),
        };
        return info;
    }).filter((info) => !!(info.getter || info.setter));
    let propertyNames = properties.map((info) => info.name);

    statics = statics.filter(n =>
        !shouldIgnore(options, n) && excludeStatics.indexOf(n) === -1 && typeof options[n] === 'function'
    );
    methods = methods.filter(n =>
        !shouldIgnore(options.prototype, n) &&
        excludeMethods.indexOf(n) === -1 &&
        propertyNames.indexOf(n) === -1 &&
        typeof options.prototype[n] === 'function'
    );

    statics.forEach(n => { log(`Found static ${n}`, debug); schema.static(n, options[n]); });
    methods.forEach(n => { log(`Found method ${n}`, debug); schema.method(n, options.prototype[n]); });
    properties.forEach((prop) => {
        let virtual = schema.virtual(prop.name);
        if (prop.getter) { virtual.get(prop.getter); }
        if (prop.setter) { virtual.set(prop.setter); }
    });
    log(`After applying mixin plugin we have the following: ${Object.keys(schema.statics)} ${Object.keys(schema.methods)}`, debug);
};
