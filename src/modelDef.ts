import { z } from "zod";
import mongoose, {
	Model,
	type HydratedDocument,
	type IndexDirection,
	type IndexOptions,
} from "mongoose";
import type {
	PostMiddlewareDefs,
	PreMiddlewareDefs,
} from "./middlewareDefinitions";
import assert from "node:assert";

export function model<T extends z.ZodTypeAny>(schema: T) {
	return { with: enhanceModel(schema) };
}

function enhanceModel<T extends z.ZodTypeAny>(schema: T) {
	type DocType = z.infer<T>;
	type Document = HydratedDocument<DocType>;
	type NormalModel = Model<z.input<T>, object, object, object, Document>;

	type VirtualDef =
		| {
				get: (this: Document) => unknown;
				set?: (this: Document, value: unknown) => void;
		  }
		| ((this: Document) => unknown);

	type Input<
		Statics extends Record<string, (this: NormalModel, ...rest: any[]) => any>,
		Methods extends Record<string, (this: Document, ...rest: any[]) => any>,
		Virtuals extends Record<string, VirtualDef>
	> = {
		collection: string;
		statics?: Statics;
		methods?: Methods;
		virtuals?: Virtuals;
		indexes?: IndexesForDoc<DocType>;
		pre?: PreMiddlewareDefs<Document>;
		post?: PostMiddlewareDefs<Document>;
	};

	return function <
		S extends Record<string, (this: NormalModel, ...rest: any[]) => any>,
		M extends Record<string, (this: Document, ...rest: any[]) => any>,
		V extends Record<string, VirtualDef>,
		I extends Input<S, M, V>
	>(input: Input<S, M, V>) {
		type MutableVirtuals = {
			[K in keyof V]: V[K] extends {
				get: (this: Document) => infer R;
				set: (this: Document, value: infer R) => void;
			}
				? R
				: never;
		};
		type MutableKeys = {
			[K in keyof MutableVirtuals]: MutableVirtuals[K] extends never
				? never
				: K;
		}[keyof MutableVirtuals];

		type ReadonlyVirtuals = {
			readonly [K in Exclude<keyof V, MutableKeys>]: V[K] extends {
				get: (this: Document) => infer R;
			}
				? R
				: V[K] extends (this: Document) => infer R
				? R
				: V[K];
		};
		type CompiledVirtuals = Pick<MutableVirtuals, MutableKeys> &
			ReadonlyVirtuals;

		const mongooseSchema = new mongoose.Schema<T["_output"]>(
			{},
			{ strict: false }
		);

		mongooseSchema.pre("validate", function (next) {
			console.log("validating");
			const doc = schema.parse(this);
			this.set(doc);
			next();
		});

		if (input.virtuals) {
			Object.entries(input.virtuals).forEach(([name, input]) => {
				const virtual = mongooseSchema.virtual(name);
				if (typeof input === "function") {
					virtual.get(input);
				} else {
					if (input.get) virtual.get(input.get);
					if (input.set) virtual.set(input.set);
				}
			});
		}
		if (input.statics)
			Object.entries(input.statics).forEach(([name, fn]) =>
				mongooseSchema.static(name, fn)
			);
		if (input.methods)
			Object.entries(input.methods).forEach(([name, fn]) =>
				mongooseSchema.method(name, fn)
			);

		if (input.indexes) {
			const indexes = input.indexes as unknown as Indexes; // help typescript out

			indexes.forEach((index) => {
				if (Array.isArray(index)) {
					mongooseSchema.index(index[0], index[1]);
				} else {
					mongooseSchema.index(index);
				}
			});
		}

		if (input.pre) {
			Object.entries(input.pre).forEach(([name, input]) => {
				const arr = Array.isArray(input) ? input : [input];

				arr.forEach((input) => {
					if (typeof input === "function") {
						mongooseSchema.pre(name as any, input);
					} else {
						const { document, query, errorHandler, fn } = input;

						mongooseSchema.pre(
							name as any,
							{ document, query, errorHandler },
							fn
						);
					}
				});
			});
		}

		if (input.post) {
			Object.entries(input.post).forEach(([name, handler]) => {
				const arr = Array.isArray(handler) ? handler : [handler];

				arr.forEach((input) => {
					if (typeof input === "function") {
						mongooseSchema.post(name as any, input as any);
					} else {
						const { errorHandler, fn } = input;

						mongooseSchema.post(name as any, { errorHandler }, fn);
					}
				});
			});
		}

		mongoose.deleteModel(input.collection);

		type NewDocType = HydratedDocument<
			z.infer<T>,
			I["methods"] & CompiledVirtuals
		>;
		type Methods = {
			[K in keyof I["methods"]]: (
				this: NewDocType,
				...args: Parameters<I["methods"][K]>
			) => ReturnType<I["methods"][K]>;
		};

		type NewModel_ = Model<
			z.input<T>,
			object,
			Methods,
			CompiledVirtuals,
			NewDocType
		>;

		type NewModel = Pick<NewModel_, keyof NewModel_> & {
			new (doc: z.input<T>): NewDocType;
		};

		type Statics = {
			[K in keyof S]: (
				this: NewModel,
				...args: Parameters<S[K]>
			) => MappedType<ReturnType<S[K]>, Document, NewDocType>;
		};

		return mongoose.model(input.collection, mongooseSchema) as NewModel &
			Statics;
	};
}

type MappedType<Convert, Original, New> = Convert extends Promise<infer C>
	? Promise<MappedType<C, Original, New>>
	: Convert extends Original
	? New
	: Convert extends Promise<Original>
	? Promise<New>
	: Convert extends Array<Original>
	? Array<New>
	: Convert extends ReadonlyArray<Original>
	? ReadonlyArray<New>
	: Convert extends Map<infer K, Original>
	? Map<K, New>
	: Convert extends ReadonlyMap<infer K, Original>
	? ReadonlyMap<K, New>
	: Convert extends Set<Original>
	? Set<New>
	: Convert extends ReadonlySet<Original>
	? ReadonlySet<New>
	: Convert extends object
	? { [P in keyof Convert | "test"]: MappedType<"test", Original, New> }
	: Convert;

type FlattenObjectPaths<T> = T extends unknown[]
	? FlattenObjectPaths<T[number]>
	: T extends Record<string, unknown>
	? FlattenPathsHelper<{
			[K in keyof T]: K extends string
				? K | `${K}.${FlattenObjectPaths<T[K]>}`
				: never;
	  }>
	: never;

type FlattenPathsHelper<T> = T[keyof T];

type IndexForDoc<T extends Record<string, unknown>> = {
	[K in FlattenObjectPaths<T>]?: IndexDirection;
};
type IndexesForDoc<T extends Record<string, unknown>> = (
	| IndexForDoc<T>
	| [IndexForDoc<T>, IndexOptions]
)[];

type Indexes = (
	| Record<string, IndexDirection>
	| [Record<string, IndexDirection>, IndexOptions]
)[];