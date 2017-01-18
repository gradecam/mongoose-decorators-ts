import * as mongoose from 'mongoose';
import {
    field,
    IMongooseDocument, ModelFromSchemaDef,
    ref, required,
    schemaDef
} from '../index';

@schemaDef({
    schema_options: {id: false},
})
export class CategorySchema {
    @required()
    _id: string;

    @field()
    description: string;

    @ref('Category', {type: String})
    parent: string;
}

export const Todo = getModel();
export type Todo = IMongooseDocument<CategorySchema>;

export function getModel(conn: mongoose.Connection = mongoose.connection) {
    return ModelFromSchemaDef<typeof CategorySchema, CategorySchema>(CategorySchema, conn);
}
