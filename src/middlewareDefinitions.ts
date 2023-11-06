import type { Aggregate, Query, SaveOptions } from "mongoose";
import type {
	AllowOptions,
	HookHandler,
	OrQuery,
	SyncOnly,
} from "./middleware";

export type PreMiddlewareDefs<
	DocType,
	QueryType = Query<unknown, DocType>
> = Partial<{
	init: HookHandler<
		DocType,
		"pre",
		unknown,
		undefined,
		AllowOptions.False,
		OrQuery.True,
		undefined,
		SyncOnly.True
	>;
	validate: HookHandler<
		DocType,
		"pre",
		unknown,
		undefined,
		AllowOptions.True,
		OrQuery.True,
		QueryType,
		SyncOnly.False
	>;
	save: HookHandler<
		DocType,
		"pre",
		unknown,
		SaveOptions,
		AllowOptions.True,
		OrQuery.True,
		QueryType,
		SyncOnly.False
	>;
	updateOne: HookHandler<
		DocType,
		"pre",
		unknown,
		undefined,
		AllowOptions.True,
		OrQuery.True,
		QueryType,
		SyncOnly.False
	>;
	deleteOne: HookHandler<
		DocType,
		"pre",
		unknown,
		undefined,
		AllowOptions.True,
		OrQuery.True,
		QueryType,
		SyncOnly.False
	>;
	count: QueryHandler<QueryType, "pre">;
	estimatedDocumentCount: QueryHandler<QueryType, "pre">;
	countDocuments: QueryHandler<QueryType, "pre">;
	deleteMany: QueryHandler<QueryType, "pre">;
	distinct: QueryHandler<QueryType, "pre">;
	find: QueryHandler<QueryType, "pre">;
	findOne: QueryHandler<QueryType, "pre">;
	findOneAndDelete: QueryHandler<QueryType, "pre">;
	findOneAndRemove: QueryHandler<QueryType, "pre">;
	findOneAndReplace: QueryHandler<QueryType, "pre">;
	findOneAndUpdate: QueryHandler<QueryType, "pre">;
	replaceOne: QueryHandler<QueryType, "pre">;
	updateMany: QueryHandler<QueryType, "pre">;
	aggregate: HookHandler<
		Aggregate<unknown>,
		"pre",
		unknown,
		undefined,
		AllowOptions.False,
		OrQuery.False,
		unknown,
		SyncOnly.False
	>;
	insertMany: HookHandler<
		unknown,
		"pre",
		unknown,
		undefined,
		AllowOptions.False,
		OrQuery.False,
		unknown,
		SyncOnly.False
	>;
}>;

export type PostMiddlewareDefs<
	DocType,
	QueryType = Query<unknown, DocType>
> = Partial<{
	init: HookHandler<
		DocType,
		"post",
		unknown,
		undefined,
		AllowOptions.True,
		OrQuery.False,
		QueryType,
		SyncOnly.True
	>;
	validate: HookHandler<
		DocType,
		"post",
		unknown,
		undefined,
		AllowOptions.True,
		OrQuery.False,
		QueryType,
		SyncOnly.False
	>;
	save: HookHandler<
		DocType,
		"post",
		unknown,
		SaveOptions,
		AllowOptions.True,
		OrQuery.False,
		QueryType,
		SyncOnly.False
	>;
	updateOne: HookHandler<
		DocType,
		"post",
		unknown,
		undefined,
		AllowOptions.True,
		OrQuery.False,
		QueryType,
		SyncOnly.False
	>;
	deleteOne: HookHandler<
		DocType,
		"post",
		{ deletedCount: 0 | 1 },
		undefined,
		AllowOptions.True,
		OrQuery.False,
		QueryType,
		SyncOnly.False
	>;
	count: QueryHandler<QueryType, "post", number>;
	estimatedDocumentCount: QueryHandler<QueryType, "post", number>;
	countDocuments: QueryHandler<QueryType, "post", number>;
	deleteMany: QueryHandler<QueryType, "post", { deletedCount: number }>;
	distinct: QueryHandler<QueryType, "post">;
	find: QueryHandler<QueryType, "post", DocType[]>;
	findOne: QueryHandler<QueryType, "post", DocType | null>;
	findOneAndDelete: QueryHandler<QueryType, "post">;
	findOneAndRemove: QueryHandler<QueryType, "post">;
	findOneAndReplace: QueryHandler<QueryType, "post">;
	findOneAndUpdate: QueryHandler<QueryType, "post">;
	replaceOne: QueryHandler<QueryType, "post">;
	updateMany: QueryHandler<QueryType, "post">;
	aggregate: HookHandler<
		Aggregate<unknown>,
		"post",
		unknown,
		undefined,
		AllowOptions.False,
		OrQuery.False,
		unknown,
		SyncOnly.False
	>;
	insertMany: HookHandler<
		unknown,
		"post",
		unknown,
		undefined,
		AllowOptions.False,
		OrQuery.False,
		unknown,
		SyncOnly.False
	>;
}>;

type QueryForDoc<DocType, ResultType = unknown, Op = "find"> = Query<
	ResultType,
	DocType,
	undefined,
	undefined,
	Op
>;

type QueryHandler<
	DocType,
	Hook extends "pre" | "post",
	ResType = unknown
> = HookHandler<
	QueryForDoc<DocType, ResType>,
	Hook,
	ResType,
	undefined,
	AllowOptions.False,
	OrQuery.False,
	undefined,
	SyncOnly.False
>;
