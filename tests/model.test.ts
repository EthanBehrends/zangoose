import { assertType, describe, expect, expectTypeOf, test, vi } from "vitest";
import { model } from "../src/modelDef";
import { z } from "zod";
import crypto from "node:crypto";
import { zObjectId } from "../src/types/mongo";
import assert from "node:assert";
import mongoose from "mongoose";

const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

const zStatus = z.enum(["invited", "active", "deleted"]);

const User = model(
	"User",
	z.object({
		firstName: z.string(),
		lastName: z.string().optional(),
		email: z.string(),
		auth: z
			.object({
				hash: z.string(),
				salt: z.string(),
			})
			.optional(),
		_status: zStatus.default("active"),
		history: z.array(
			z.object({
				date: z.date(),
				action: z.enum([
					"login",
					"logout",
					"signup",
					"update",
					"statusChange",
					"changePassword",
				]),
			})
		),
		friends: z.array(zObjectId()).default([]),
	})
).with({
	collection: "users",
	statics: {
		async findByEmail(email: string) {
			return this.findOne({ email });
		},
		async list(page: number) {
			return this.find()
				.skip(page * 50)
				.limit(50);
		},
	},
	methods: {
		async verifyPassword(password: string) {
			return !!(this.auth && this.auth.hash === password + this.auth.salt);
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
		status: {
			get() {
				return this._status;
			},
			set(status: z.TypeOf<typeof zStatus>) {
				this._status = status;
				this.history.push({
					date: new Date(),
					action: "statusChange",
				});
			},
		},
	},
});

describe("Typesafety", async () => {
	const user = new User({
		firstName: "John",
		lastName: "Doe",
		email: "john.doe@example.com",
		history: [],
	});

	test("Virtuals without setters are readonly", () => {
		expectTypeOf(user).toMatchTypeOf<{ readonly fullName: string }>();

		try {
			// @ts-expect-error Cannot assign to readonly value
			user.fullName = "Readonly";

			user.status = "active";
		} catch {}
	});

	test("Methods are defined", () => {
		expectTypeOf(user.verifyPassword).toMatchTypeOf<Function>();
		expectTypeOf(user.verifyPassword).toMatchTypeOf<
			(password: string) => Promise<Boolean>
		>();
	});

	test("Static methods map to the hydrated type", async () => {
		expectTypeOf(User.findByEmail).toMatchTypeOf<Function>();
		expectTypeOf(User.findByEmail).toMatchTypeOf<
			(email: string) => Promise<typeof user | null>
		>();
		expectTypeOf(User.list).toMatchTypeOf<
			(number: number) => Promise<(typeof user)[]>
		>();
	});

	test("Non-enhanced models typed correctly", () => {
		const UnenhancedUser = model(
			"UnenhancedUser",
			z.object({
				firstName: z.string(),
				lastName: z.string().optional(),
				email: z.string(),
				auth: z
					.object({
						hash: z.string(),
						salt: z.string(),
					})
					.optional(),
				_status: zStatus.default("active"),
				history: z.array(
					z.object({
						date: z.date(),
						action: z.enum([
							"login",
							"logout",
							"signup",
							"update",
							"statusChange",
							"changePassword",
						]),
					})
				),
				friends: z.array(zObjectId()).default([]),
			})
		);

		const user = new UnenhancedUser({
			firstName: "John",
			lastName: "Doe",
			email: "john.doe@example.com",
			history: [],
		});

		user.lastName;

		expectTypeOf(user).toMatchTypeOf<{
			firstName: string;
		}>();

		expectTypeOf(user.lastName).toMatchTypeOf<string | undefined>();

		expectTypeOf(user.history).toMatchTypeOf<
			{
				date: Date;
				action:
					| "login"
					| "logout"
					| "signup"
					| "update"
					| "statusChange"
					| "changePassword";
			}[]
		>();
	});
});

describe("Schema construction", async () => {
	const user = new User({
		firstName: "John",
		lastName: "Doe",
		email: "john.doe@example.com",
		history: [],
	});

	test("Method definitions", async () => {
		user.setPassword("password");

		await expect(user.verifyPassword("123456")).resolves.toBe(false);
		await expect(user.verifyPassword("password")).resolves.toBe(true);
	});

	describe("Hooks", () => {
		test("Pre hooks", async () => {
			const historyLength = user.history.length;

			await user.save();

			expect(user.history).toHaveLength(historyLength + 1);
		});
		test("Zod validation", async () => {
			const user = new User({
				firstName: "John",
				lastName: "Doe",
				email: "john.doe@example.com",
				history: [],
			});

			//@ts-expect-error cannot delete property
			delete user.history;

			await expect(async () => {
				await user.validate();
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
	});

	test("zObjectId", async () => {
		const Person = model(
			"Person",
			z.object({
				name: z.string(),
			})
		).with({
			collection: "person",
			methods: {},
			virtuals: {},
		});

		const BlogPost = model(
			"BlogPost",
			z.object({
				title: z.string(),
				description: z.string(),
				commenters: zObjectId().array(),
			})
		).with({
			collection: "blog-post",
		});

		const post = await BlogPost.findOne();

		if (post) {
			post.title;
			post.commenters;
			const commenters = await Person.find({ _id: { $in: post.commenters } });
		}
	});

	describe("Collection name", async () => {
		test("Default collection name", async () => {
			const DefaultTest = model("DefaultTest", z.object({}));

			expect(DefaultTest.collection.name).toBe("default_test");
		});
		test("Custom collection name", async () => {
			const CustomUser = model(
				"CustomUser",
				z.object({
					firstName: z.string(),
					lastName: z.string().optional(),
				})
			).with({
				collection: "custom-users",
			});

			expect(CustomUser.collection.name).toBe("custom-users");
		});
	});
});
