import 'reflect-metadata';
import * as mongoose from 'mongoose';
import * as mongodb from 'mongodb';
import {MixinPlugin} from './mixin-plugin';

export type IMongooseDocument<T> = T & mongoose.Document;
export type IMongooseModel<TModel, TDoc> = TModel & mongoose.Model<IMongooseDocument<TDoc>>;
export type IdLike = string | number | Buffer | mongoose.Schema.Types.ObjectId;
export type DocLike = {_id: IdLike};
export type IdOrDocLike = IdLike | DocLike;

/**
 * Contains information needed to create a model from a decorated class
 */
export interface IModelInfo {
    modelName: string | null;
    debug: boolean;
    schemaObj: null | any;
    schema: mongoose.Schema | null;
    children: IMongooseClassMetadataHolder[];
    preHooks: { name: string, fn: (next: (err?: mongoose.NativeError) => void) => void,
      errorCb?: (err: Error) => void}[];
    postHooks: { name: string, fn: (doc: any, next: (err?: mongoose.NativeError) => void) => void}[];
}

export interface IMongooseClassMetadataHolder {
    _$_mongooseMeta: IModelInfo;
}
// interface IMongooseFields {
//     [name: string]: any;
// }

/**
 * Rreates the actual Mongoose Model which is used to perform queries and create
 * instances of a mongoose Model.
 * @type {[type]}
 */
export function ModelFromSchemaDef<TModel, TDocument>(cls:TModel, conn?:mongoose.Connection ) {
    conn = conn || mongoose.connection;
    let data = getMetadata(cls, true);
    if (conn.modelNames().indexOf(<any>data.modelName) !== -1) {
        return <IMongooseModel<TModel, TDocument>>conn.model(<any>data.modelName);
    }
    if (!data || !data.modelName) {
        throw new Error('Provided object has not been decorated with @Schema!');
    }

    // console.log(`Creating model: ${data.schemaName}`);
    let Model: IMongooseModel<TModel, TDocument> = <any>conn.model(data.modelName, <any>data.schema);
    return Model;
}

/**
 * Get the schema for a class which has been decorated with @Schema;
 * use this if you need functionality not otherwise available to
 * your class
 *
 * @param {@Schema class} obj     A class which has been
 * @return {mongoose.Schema}      The schema which was generated for the class
 *                                using the decorated properties
 */
export function getSchema(obj:any) : mongoose.Schema | null {
    let data = getMetadata(obj, true);
    return data && data.schema;
}


/**
 * Returns the metadata object with the Schema information
 * @param  {any}      cls  The object to get metadata for
 * @param  {boolean}  safe Unless true the metadata and schema will be created for the class if it doesn't exist
 * @return {object}        The metadata object
 */
function getMetadata(cls:any, safe?: boolean) {
    if (!cls) { throw new Error('Cannot getMetadata of null'); }
    let obj: IMongooseClassMetadataHolder = cls;
    if (!obj._$_mongooseMeta && !safe) {
        // console.log('Defining the property');
        Object.defineProperty(obj, '_$_mongooseMeta', {
            configurable: false,
            enumerable: false,
            value: <IModelInfo>{
                children: [],
                debug: false,
                modelName: null,
                postHooks: [],
                preHooks: [],
                schema: null,
                schemaObj: {},
            },
            writable: false,
        });
        // obj._$_mongooseMeta = {
        //     schemaName: null,
        //     schema: new mongoose.Schema(),
        //     children: []
        // };
    }
    return obj._$_mongooseMeta;
}

/**
 * This function will check to see if the provided type is a class which
 * has been decorated with @Schema and if so it will return the mongoose
 * Schema so that the type works correctly
 *
 * @param {any} type A type which may or may not be a @Schema-decorated class
 */
function normalizeType(type:any) : any {
    if (type instanceof Array) {
        // console.log('Array!');
        if (type.length != 1) { throw new Error(`Invalid type: ${type}`); }
        return [normalizeType(type[0])];
    }
    if (type == Object) {
        // This is what comes from an any type; it maps to mixed
        return mongoose.Schema.Types.Mixed;
    } else if (type == mongoose.Types.ObjectId) {
        // Turns out the actual ObjectID type doesn't work, so we need to map
        // to the schematype ObjectId
        return mongoose.Schema.Types.ObjectId;
    }
    let schema = getSchema(type);
    return schema || type;
}

/**
 * Figures out the name of a class by looking at the .toString()
 * @param  {any}     cls The class to get the name for
 * @return {string}      The name of the class
 */
function getClassName(cls:any) : string {
    let funcNameRegex = /class ([^ {]{1,})/;
    let results = (funcNameRegex).exec(cls.toString());
    return (results && results.length > 1) ? results[1] : '';
}

/**
 * Returns the name of the model from a decorated class. If class name ends
 * in 'Schema' the resultant modelName will strip 'Schema' from the derivied
 * name, otherwise the class name will be returned.
 * @param  {any}    cls The class to get the name for
 * @return {string}     The derived modelName
 */
function getModelName(cls: any): string {
    let modelName = getClassName(cls);
    const suffix = 'Schema';
    return modelName.endsWith(suffix) ?
        modelName.substr(0, modelName.length - suffix.length) :
        modelName;
}

export type PluginFunction = (schema: mongoose.Schema, options?: any) => void;

export interface ISchemaPlugin {
    plugin: PluginFunction;
    options?: any;
}

/**
 * The options which can be passed into the @Schema class decorator
 */
export interface ISchemaOptions {
    /**
     * If provided, this is the name that will be used for the model (if you
     * use the createModel method of this library).  If not provided, the name
     * of the class will be used.  Auto-detecting the name may not work well
     * in conjunction with other decorators and/or unusually built classes.
     *
     * @type {string}
     */
    name?: string;

    /**
     * This should be an array of arrays where each array defines an index. The
     * format is the same as the format returned by getIndexes on a mongodb model.
     * Each entry in the indexes array should be an array with one or two objects;
     * the first is the object indicating which fields are in the index, the second
     * are the options for the index
     *     [
     *         [{field1: 1, field2: 1}, {unique: true}],
     *         [{field: 1}],
     *         [{field: 1, field: 2, field: 3}]
     *     ]
     */
    indexes?: any[][];

    /**
     * Any plugins which you want to run on the model should be added in this
     * array.
     *
     *     [
     *         {plugin: LastModifiedPlugin},
     *         {plugin: NextModifiedPlugin, options: {index: true}}
     *     ]
     */
    plugins?: ISchemaPlugin[];

    /**
     * Any options that you want to be passed into the new Schema(name, opts: Options) call
     * @type {Schema Options}
     */
    schema_options?: any;

    debug?: boolean;
}

/**
 * Decorates a class to be a Mongoose model/document. When used in conjunction
 * with the @Field and @ArrayField decorators this collects the information
 * needed to generate a mongoose Schema
 *
 * @param  {ISchemaOptions} opts Options for the schema, including indexes
 * @return {ClassDecorator}      Returns the decorator which does the work
 */
export function schemaDef<TF extends Function>(target: TF): TF | void;
export function schemaDef(opts?: ISchemaOptions): ClassDecorator;
export function schemaDef(v?: any) : any {
    let opts:ISchemaOptions = {};
    if (typeof v == 'function') {
        return ModelClassDecorator(v);
    }
    opts = v as ISchemaOptions || {};
    function ModelClassDecorator<TF extends Function>(target: TF): TF | void {
        // It turns out that this decorator runs only after the entire class has been defined --
        // and thus after all the other decorators have run.  This makes it easy to convert
        // the object we've been building into a schema
        let data = getMetadata(target);
        data.modelName = opts.name || getModelName(target);
        data.debug = !!opts.debug;

        if (data.debug) {
            console.log(`Creating schema: ${data.modelName}`);
        }
        data.schema = new mongoose.Schema(data.schemaObj, opts.schema_options);
        if (opts.indexes) {
            opts.indexes.forEach(i => data.schema && data.schema.index.apply(data.schema, i));
        }
        if (opts.plugins) {
            opts.plugins.forEach(p => data.schema && data.schema.plugin(p.plugin, p.options));
        }
        data.preHooks.forEach (hook => data.schema && data.schema.pre (hook.name, hook.fn));
        data.postHooks.forEach(hook => data.schema && data.schema.post(hook.name, hook.fn));

        MixinPlugin(data.schema, target, data.debug);

        return target;
    }
    return ModelClassDecorator;
}

/**
 * Utility method used during model definitions
 * @param {any}    target      target object
 * @param {string} propertyKey property name
 * @param {any}    opts        property options
 */
function getFieldByName(target: any, propertyKey: string, opts: any) {
    let data = getMetadata(target.constructor);
    let field = data.schemaObj[propertyKey];
    if (!field) {
        let type = opts.type || Reflect.getMetadata('design:type', target, propertyKey);
        type = normalizeType(type);
        if (opts.debug) {
            console.log(`Trying to link ${propertyKey} type [${type}]`);
        }
        field = data.schemaObj[propertyKey] = {
            type: type
        };
    }
    return field;
}

/**
 * Exactly like getFieldByName except this is called when field is an array type.
 * @param {any}    target      target object
 * @param {string} propertyKey property name
 * @param {any}    opts        property options
 */
function getArrayByName(target: any, propertyKey: string, opts: any) {
    let data = getMetadata(target.constructor);
    let field: any[] = data.schemaObj[propertyKey];
    if (!field) {
        let type = opts.type || Reflect.getMetadata('design:type', target, propertyKey);
        type = normalizeType(type);
        if (opts.debug) {
            console.log(`Trying to link ${propertyKey} type`);
        }
        field = data.schemaObj[propertyKey] = [{
            type: type
        }];
    }
    return field[0];
}

/**
 * Sets mongoose field options
 * @param {any}    target      target object
 * @param {string} propertyKey property name
 * @param {any}    opts        property options
 */
function setFieldOpts(target: any, propertyKey: string, opts: any) {
    opts = opts || {};
    let field = getFieldByName(target, propertyKey, opts);
    if (opts.type) {
        opts.type = normalizeType(opts.type);
    }
    Object.assign(field, opts);
}

/**
 * Sets mongoose options for array fields.
 * @param {any}    target      target object
 * @param {string} propertyKey property name
 * @param {any}    opts        property options
 */
function setArrayOpts(target: any, propertyKey: string, opts: any) {
    let field = getArrayByName(target, propertyKey, opts);
    if (opts.type) {
        opts.type = normalizeType(opts.type);
    }
    Object.assign(field, opts);
}

/**
 * Use this as a helper to make new field decorators
 * @param {any} defaultOpts defaults for the field decorator
 */
function makeFieldDecorator(defaultOpts: any) {
    function FieldDecorator(opts?: any): PropertyDecorator;
    function FieldDecorator(t: any, pKey: string): void;
    function FieldDecorator(opts?:any, pKey?: string) : PropertyDecorator | void {
        if (pKey) {
            let t = opts;
            opts = defaultOpts;
            return SchemaFieldDecorator(t, pKey);
        }
        opts = Object.assign({}, defaultOpts, opts);
        function SchemaFieldDecorator(target: any, propertyKey: string) : void {
            setFieldOpts(target, propertyKey, opts);
        }
        return SchemaFieldDecorator;
    }

    return FieldDecorator;
}

/**
 * Decorator for class properties which should be mapped to a field on the
 * document in the database.  Any options provided will be passed in the same
 * as options defined on a mongoose schema would be.  The name will be the same
 * as the name of the property; if type is not specified it will be auto-detected.
 * Note that array types cannot be auto-detected, so if you need an array type use
 * @ArrayField instead.
 *
 * @param {any} opts Field options as defined by mongoose
 */
export const field = makeFieldDecorator({});

/**
 * Specialization of @Field which marks a field required
 */
export const required = makeFieldDecorator({ required: true });

/**
 * Specialization of @Field which marks a field to be an index
 */
export const indexed = makeFieldDecorator({ index: true });

/**
 * Specialization of @Field which marks a field to be unique
 */
export const unique = makeFieldDecorator({ unique: true });

/**
 * Specialization of @Field which marks a field to be lowercase
 */
export const lower = makeFieldDecorator({ lowercase: true });

/**
 * Specialization of @Field which marks a field to be lowercase
 */
export const upper = makeFieldDecorator({ uppercase: true });

/**
 * Specialization of @Field for setting a default
 */
export function defaultVal(defaultValue: any, opts?: any) {
    opts = opts || {};
    Object.assign(opts, { default: defaultValue });
    return makeFieldDecorator(opts);
}

/**
 * Specialization of @Field for specifying a ref the default
 * type is ObjectId but if specified in opts must be one of:
 *     Buffer, Number, ObjectId, or String
 */
export function ref(ref: string, opts?: any) {
    const defaults = {type: mongoose.Schema.Types.ObjectId};
    opts = Object.assign({}, defaults, opts, {ref: ref});
    return makeFieldDecorator(opts);
}

/**
 * Specialization of @Field for specifying an enum (string fields only)
 */
export function enumVal(enumVal: string[], opts?: any) {
    opts = opts || {};
    Object.assign(opts, { type: String, enum: enumVal });
    return makeFieldDecorator(opts);
}

/**
 * Specialization of @Field for specifying a maximum length (string fields only)
 */
export function maxLen(len: number, opts?: any) {
    opts = opts || {};
    Object.assign(opts, { type: String, maxlength: len });
    return makeFieldDecorator(opts);
}

/**
 * Specialization of @Field for specifying a minimum length (string fields only)
 */
export function minLen(len: number, opts?: any) {
    opts = opts || {};
    Object.assign(opts, { type: String, minlength: len });
    return makeFieldDecorator(opts);
}

/**
 * Specialization of @Field for specifying a field setter
 */
export function setter(fn: (val: any, schema?: mongoose.Schema) => any) {
    return makeFieldDecorator({ set: fn });
}

/**
 * Specialization of @Field for specifying a field getter
 */
export function getter(fn: () => any) {
    return makeFieldDecorator({ set: fn });
}

/**
 * Specialization of @Field for specifying a regex match (string fields only)
 */
export function regex(regex: RegExp, opts?: any) {
    opts = opts || {};
    Object.assign(opts, { type: String, match: regex });
    return makeFieldDecorator(opts);
}

/**
 * Specialization of @Field which marks a field as type: Date (since reflection doesn't work correctly on class properties of type Date)
 */
export const dateField = makeFieldDecorator({ type: Date });

/**
 * Use this if you have a field which is a typed array; we can't use reflection
 * to detect the array type, so this is needed.
 * @param  {type}               inType The type of the array
 * @param  {options}            opts   an object with the Schema Type options for this field, if any
 * @return {PropertyDecorator}  A decorator which will apply the desired attributes
 */
export function arrayField(inType: any, opts?:any) {
    opts = opts || {};
    Object.assign(opts, { type: [inType] });
    return makeFieldDecorator(opts);
}

/**
 * Use this if you have a field which is a typed array; we can't use reflection
 * to detect the array type, so this is needed.
 * @param  {type}               inType     The type of the array
 * @param  {options}            opts       an object with the Schema Type options for this field, if any
 * @return {PropertyDecorator}             A decorator which will apply the desired attributes
 */
export function refArray(ref: string, inType?: any, opts?:any) {
    opts = opts || {};
    Object.assign(opts, { type: inType, ref: ref });
    return makeArrayDecorator(opts);
}
/**
 * Use this as a helper to make new decorators for array fields with special needs
 * currently used just for refArray
 * @param {any} defaultOpts defaults for the array decorator
 */
function makeArrayDecorator(defaultOpts: any) {
    function ArrayFieldDecorator(opts?: any): PropertyDecorator;
    function ArrayFieldDecorator(t: any, pKey: string): void;
    function ArrayFieldDecorator(opts?:any, pKey?: string) : PropertyDecorator | void {
        if (pKey) {
            let t = opts;
            opts = defaultOpts;
            return SchemaArrayFieldDecorator(t, pKey);
        }
        opts = Object.assign({}, defaultOpts, opts);
        function SchemaArrayFieldDecorator(target: any, propertyKey: string) : void {
            setArrayOpts(target, propertyKey, opts);
        }
        return SchemaArrayFieldDecorator;
    }

    return ArrayFieldDecorator;
}

/**
 * Apply to a method with the event string to configure a pre-hook for the desired event
 * @param  {string}          event the name of the event, e.g. 'save'
 * @return {MethodDecorator}       A decorator which will set up the hook
 */
export function pre(event: string) : MethodDecorator {
    function PreDecorator(
        target: Object, propertyKey: string | symbol,
        descriptor: TypedPropertyDescriptor<Function>) : TypedPropertyDescriptor<Function> | void {
        let data = getMetadata(target.constructor);
        data.preHooks.push({ name: event, fn: <any>descriptor.value });
    }
    return PreDecorator;
}

/**
 * Apply to a method with the event string to configure a pre-hook for the desired event
 * @param  {string}          event the name of the event, e.g. 'save'
 * @return {MethodDecorator}       A decorator which will set up the hook
 */
export function post(event: string) : MethodDecorator {
    function PostDecorator(
        target: Object, propertyKey: string | symbol,
        descriptor: TypedPropertyDescriptor<Function>) : TypedPropertyDescriptor<Function> | void {
        let data = getMetadata(target.constructor);
        data.postHooks.push({ name: event, fn: <any>descriptor.value });
    }
    return PostDecorator;
}

/**
 * Apply to a static or method if you don't want it to end up on the runtime object
 * (I don't really know why you'd want this, but in case you do...)
 */
export function ignore(
    target: Object, propertyKey: string | symbol,
    descriptor: TypedPropertyDescriptor<Function>) : TypedPropertyDescriptor<Function> | void {
    Reflect.defineMetadata('schema:ignore', true, target, propertyKey);
}
