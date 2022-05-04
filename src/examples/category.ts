import * as mongoose from 'mongoose';
import {
    field,
    ModelFromSchemaDef,
    required,
    schemaDef,
    populateVirtual,
    ignore
} from '../index';
import { TodoDocument } from './todo';

@schemaDef({
    schema_options: {id: false},
})
export class CategorySchema {
    @required()
    _id: string;

    @field()
    description: string;

    @populateVirtual({ref: 'Todo', localField: '_id', foreignField: 'category', justOne: false})
    todoItems: mongoose.Types.DocumentArray<TodoDocument>;

    @ignore
    _doSomethingWeirdInSecret() {

    }
}

export const Category = getModel();
export type Category = InstanceType<typeof Category>;

export function getModel(conn: mongoose.Connection = mongoose.connection) {
    return ModelFromSchemaDef(CategorySchema, conn);
}
