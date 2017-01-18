import * as mongoose from 'mongoose';
import { MAX_PRIORITY, Todo } from '../examples/todo';
import { expect } from 'chai';

(<any>mongoose).Promise = global.Promise;
const mockgoose = require('mockgoose'); // tslint:disable-line

describe('test Todo model', function userSuite() {
    before((done: Function) => {
        mockgoose(mongoose).then(() =>
            mongoose.connect('mongodb://dburi/database', (err: any) => done(err))
        );
    });

    it('should have a mocked mongoose', () =>
        expect((<any>mongoose).isMocked).to.be.true
    );

    it('should start with an empty todo list', async () => {
        let count: number = await Todo.find().count().exec();
        expect(count).to.equal(0);
    });

    it('should be able to create todo', async () => {
        return Todo.create({title: 'sample todo', priority: 2});
    });

    it('should have default priority if not specified during create', async () => {
        let todo: Todo = await Todo.create({title: 'default test'});
        expect(todo.priority).to.equal(1);
    });

    it('should not be able to create todo with priority > max priority', async () => {
        return Todo.create({title: 'excessive priority', priority: MAX_PRIORITY + 1})
            .then(
                async () => Promise.reject('create should have failed.'),
                async () => Promise.resolve('failed to create with excessive priority')
            );
    });
});
