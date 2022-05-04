import * as mongoose from 'mongoose';
import {
    arrayField, dateField, field,
    ModelFromSchemaDef,
    ref, required,
    schemaDef,
    populateVirtual
} from '../index';
import { Category } from './category';

export const MAX_PRIORITY = 10;

@schemaDef({
    indexes: [
        [{category: 1, priority: -1}],
        [{priority: -1}],
        [{tags: 1, priority: -1}],
    ],
    schema_options: {id: false},
})
export class TodoSchema {
    _id: mongoose.Types.ObjectId;

    @required()
    title: string;

    // Using the "terse" way for defining a virtual populate field
    @ref('Category', {default: 'inbox', type: String, populateField: 'categoryDoc'})
    category: string;
    categoryDoc: any;
    
    // Using the "verbose" (and more powerful) way for defining a virtual populate field
    @populateVirtual({ref: 'Category', localField: 'category', foreignField: '_id', justOne: true})
    categoryDoc2?: Category;

    @required({default: 1, min: 1, max: MAX_PRIORITY})
    priority: number;

    @field()
    notes: string;

    @arrayField(String)
    tags: string[];

    @dateField()
    dueAt: Date;

    static findByCategory(this: typeof TodoModel, category: string, priority: number = 0, filterOpts?: any) {
        let filter: any = Object.assign({}, filterOpts, {category: category}, priority ? {priority: priority} : {});
        return this.find(filter);
    }

    isMaxPriority(): boolean {
        return this.priority == MAX_PRIORITY;
    }
}

export const TodoModel = getModel();
export type TodoDocument = InstanceType<typeof TodoModel>;

export function getModel(conn: mongoose.Connection = mongoose.connection) {
    return ModelFromSchemaDef<typeof TodoSchema, TodoSchema>(TodoSchema, conn);
}
