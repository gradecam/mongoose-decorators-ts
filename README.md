[![Build Status](https://travis-ci.org/gradecam/mongoose-decorators-ts.svg?branch=master)](https://travis-ci.org/gradecam/mongoose-decorators-ts)

# mongoose-decorators-ts

Collection of TypeScript decorators intended for creating Mongoose Schemas from TypeScript classes. This allows you to write your class implementation once with the properties, static methods, getters, setters, etc. and have them properly understood by the rest of your TypeScript project and handled correctly by Mongoose.

## Example

```typescript
// examples/todo.ts
import * as mongoose from 'mongoose';
import {
    arrayField, dateField, field,
    IMongooseDocument, ModelFromSchemaDef,
    ref, required,
    schemaDef
} from '../index';

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
    @required()
    title: string;

    @ref('Category', {default: 'inbox', type: String})
    category: string;

    @required({default: 1, min: 1, max: MAX_PRIORITY})
    priority: number;

    @field()
    notes: string;

    @arrayField(String)
    tags: string[];

    @dateField()
    dueAt: Date;

    static findByCategory(this: typeof Todo, category: string, priority: number = 0, filterOpts?: any) {
        let filter: any = Object.assign({}, filterOpts, {category: category}, priority ? {priority: priority} : {});
        return this.find(filter);
    }

    isMaxPriority(): boolean {
        return this.priority == MAX_PRIORITY;
    }
}

export const Todo = getModel();
export type Todo = IMongooseDocument<TodoSchema>;

export function getModel(conn: mongoose.Connection = mongoose.connection) {
    return ModelFromSchemaDef<typeof TodoSchema, TodoSchema>(TodoSchema, conn);
}
```

## Example Usage

Assuming you have defined a model `Todo` as above you can now interact with this in your other code as you might expect.

```typescript
import {Todo} from './examples/todo';

/**
 * This is not intended to be an efficient version of getting
 * your most important todos. It exists to demonstrate usage
 * of both static and instance methods of the Todo model via Mongoose.
 * @return {Todo[]} Todo's from the specified category
 */
async function getMaxPriorityTodos(category: string) {
    // find todo's of a given category
    let todos = await Todo.findByCategory(category).exec();
    return todos.filter(todo => todo.isMaxPriority());
}

```
