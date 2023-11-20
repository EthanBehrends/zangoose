import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import { afterAll, beforeAll } from "vitest";

let mongod: MongoMemoryServer | undefined;

beforeAll(async () => {
	console.log("setting up");
	mongod = await MongoMemoryServer.create();

	await mongoose.connect(mongod.getUri());
});

afterAll(async () => {
	await mongoose.disconnect();

	await mongod?.stop();
});
