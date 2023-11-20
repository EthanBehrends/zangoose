import { assertType, expect, expectTypeOf, test, vi } from "vitest";
import { model } from "../src/modelDef";
import { z } from "zod";
import crypto from "node:crypto";
import { zObjectId } from "../src/types/mongo";
import assert from "node:assert";

const userSchema = z.object({
	firstName: z.string(),
	lastName: z.string().optional(),
	email: z.string(),
	auth: z
		.object({
			hash: z.string(),
			salt: z.string(),
		})
		.optional(),
	history: z.array(
		z.object({
			date: z.date(),
			action: z.enum([
				"login",
				"logout",
				"signup",
				"delete",
				"update",
				"changePassword",
			]),
		})
	),
	friends: z.array(zObjectId()).default([]),
});

test("model definitions", async () => {
	const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

	const User = model(userSchema).with({
		collection: "users",
		statics: {
			async findByEmail(email: string) {
				return this.findOne({ email });
			},
		},
		methods: {
			async verifyPassword(password: string) {
				return this.auth && this.auth.hash === password + this.auth.salt;
			},
			setPassword(password: string) {
				const salt = crypto.randomBytes(30).toString("hex");
				const hash = password + salt;
				this.auth = { hash, salt };
			},
		},
		indexes: [
			[{ email: 1 }, { unique: true }],
			{ firstName: 1 },
			{ "auth.hash": 1 },
			{ "history.action": 1 },
		],
		pre: {
			save() {
				this.history.push({
					date: new Date(),
					action: "update",
				});
			},
		},
		virtuals: {
			fullName: {
				get() {
					if (!this.lastName) return this.firstName;
					return `${this.firstName} ${this.lastName}`;
				},
			},
		},
	});

	const user = new User({
		firstName: "John",
		lastName: "Doe",
		email: "john.doe@example.com",
		history: [],
	});

	expectTypeOf(user).toMatchTypeOf<{ readonly fullName: string }>();

	try {
		// @ts-expect-error Cannot assign to readonly value
		user.fullName = "Readonly";
	} catch {}

	expectTypeOf(user).toMatchTypeOf<{
		auth?: { hash: string; salt: string };
	}>();

	user.setPassword("password");

	await expect(user.verifyPassword("123456")).resolves.toBe(false);
	await expect(user.verifyPassword("password")).resolves.toBe(true);

	await user.save();

	expect(user.history).toHaveLength(1);

	const user2 = await User.findByEmail("john.doe@example.com");

	assert(user2);

	//@ts-expect-error cannot delete property
	delete user2.history;

	await expect(async () => {
		await user2.validate();
	}).rejects.toThrow();

	await expect(async () => {
		// todo: typechecking
		await User.create({
			firstName: "Sally",
			lastName: "Tester",
		});
	}).rejects.toThrow();

	await User.updateOne(
		{ email: "sally@example.com" },
		{ firstName: "Sally" },
		{ upsert: true }
	);

	const calls = consoleSpy.mock.calls.length;

	await User.findByEmail("sally@example.com");

	expect(consoleSpy.mock.calls.length).toBeGreaterThan(calls);
});
