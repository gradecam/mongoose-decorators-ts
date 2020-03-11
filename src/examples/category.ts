import * as mongoose from 'mongoose';
import {
    field,
    IMongooseDocument, ModelFromSchemaDef,
    required,
    schemaDef,
    populateVirtual
} from '../index';
import { Todo } from './todo';

@schemaDef({
    schema_options: {id: false},
})
export class CategorySchema {
    @required()
    _id: string;

    @field()
    description: string;

    @populateVirtual({ref: 'Todo', localField: '_id', foreignField: 'category', justOne: false})
    todoItems: mongoose.Types.DocumentArray<Todo>[];
}

export const Category = getModel();
export type Category = IMongooseDocument<CategorySchema>;

export function getModel(conn: mongoose.Connection = mongoose.connection) {
    return ModelFromSchemaDef<typeof CategorySchema, CategorySchema>(CategorySchema, conn);
}
