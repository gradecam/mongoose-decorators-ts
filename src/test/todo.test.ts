import * as mongoose from 'mongoose';
import { MAX_PRIORITY, Todo } from '../examples/todo';
import { expect } from 'chai';
import { MongoMemoryServer } from 'mongodb-memory-server';
const mongoDfd = MongoMemoryServer.create();
(<any>mongoose).Promise = global.Promise;

describe('test Todo model', function userSuite() {
    before(async () => {
        this.timeout(15000);
        const mongod = await mongoDfd;
        const uri = await mongod.getUri();
        await mongoose.connect(uri, {
            useCreateIndex: true,
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
    });

    after(async () => {
        const mongod = await mongoDfd;
        return mongoose.disconnect()
            .then(() => mongod.stop())
    });

    it('should start with an empty todo list', async () => {
        let count: number = await Todo.find().countDocuments().exec();
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
