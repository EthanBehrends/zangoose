import { expect, test } from "vitest";
import { model } from "../src/modelDef";
import { z } from "zod";
import { zObjectId } from "../src/types/mongo";

test("model definitions", async () => {
	const User = model(
		z.object({
			firstName: z.string(),
			lastName: z.string().optional(),
			email: z.string(),
			auth: z.object({
				hash: z.string().optional(),
				salt: z.string().optional(),
			}),
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
		})
	).with({
		collection: "users",
		statics: {
			async findByEmail(email: string) {
				return this.findOne({ email });
			},
		},
		methods: {
			async verifyPassword(password: string) {
				return this.auth.hash === password + this.auth.salt;
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
		auth: {
			hash: "123456",
		},
		history: [],
	});

	const test = user.firstName;

	user.verifyPassword("123456");

	await expect(async () => {
		await user.validate();
	}).rejects.toThrow("missing required property 'auth'");
});
