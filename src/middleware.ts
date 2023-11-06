import type { CallbackWithoutResultAndOptionalError } from "mongoose";

export enum AllowOptions {
	True,
	False,
}

export enum OrQuery {
	True,
	False,
}

export enum SyncOnly {
	True,
	False,
}

type Arrayable<T> = T | T[];

type HandlerHelper<
	ThisType = unknown,
	Hook extends "pre" | "post" = "pre" | "post",
	ResType = unknown,
	Options = Record<string, unknown> | undefined,
	ErrorHandler extends boolean = false,
	_SyncOnly extends SyncOnly = SyncOnly.False
> = Hook extends "post"
	? ErrorHandler extends true
		? (
				this: ThisType,
				err: NativeError,
				res: ResType,
				next: CallbackWithoutResultAndOptionalError
		  ) => _SyncOnly extends SyncOnly.True ? void : void | Promise<void>
		: (
				this: ThisType,
				res: ResType,
				next: CallbackWithoutResultAndOptionalError,
				opts: Options
		  ) => _SyncOnly extends SyncOnly.True ? void : void | Promise<void>
	: (
			this: ThisType,
			next: CallbackWithoutResultAndOptionalError,
			opts: Options
	  ) => _SyncOnly extends SyncOnly.True ? void : void | Promise<void>;

export type HookHandler<
	ThisType = unknown,
	Hook extends "pre" | "post" = "pre" | "post",
	ResType = unknown,
	Options = Record<string, unknown>,
	_AllowOptions extends AllowOptions = AllowOptions.True,
	_OrQuery extends OrQuery = OrQuery.False,
	QueryType = unknown,
	_SyncOnly extends SyncOnly = SyncOnly.False
> = Arrayable<
	| (_AllowOptions extends AllowOptions.True
			? _OrQuery extends OrQuery.True
				?
						| {
								document: boolean;
								query: boolean;
								errorHandler?: Hook extends "post" ? true | undefined : never;
						  } & (
								| {
										document: true;
										query: false;
										errorHandler?: never;
										fn: HandlerHelper<
											ThisType,
											Hook,
											ResType,
											Options,
											false,
											_SyncOnly
										>;
								  }
								| {
										document: false;
										query: true;
										errorHandler?: never;
										fn: HandlerHelper<
											QueryType,
											Hook,
											ResType,
											Options,
											false,
											_SyncOnly
										>;
								  }
								| {
										document: true;
										query: true;
										errorHandler?: never;
										fn: HandlerHelper<
											ThisType | QueryType,
											Hook,
											ResType,
											Options,
											false,
											_SyncOnly
										>;
								  }
								| {
										document: true;
										query: false;
										errorHandler: true;
										fn: HandlerHelper<
											ThisType,
											Hook,
											ResType,
											Options,
											true,
											_SyncOnly
										>;
								  }
								| {
										document: false;
										query: true;
										errorHandler: true;
										fn: HandlerHelper<
											QueryType,
											Hook,
											ResType,
											Options,
											true,
											_SyncOnly
										>;
								  }
								| {
										document: true;
										query: true;
										errorHandler: true;
										fn: HandlerHelper<
											ThisType | QueryType,
											Hook,
											ResType,
											Options,
											true,
											_SyncOnly
										>;
								  }
						  )
				: // 	| Post extends true
				// ? {
				// 		errorHandler: true;
				// 		fn: HandlerHelper<ThisType, Post, ResType, Options, true, SyncOnly>;
				//   }
				// : never
				Hook extends "post"
				? {
						errorHandler: true;
						fn: HandlerHelper<
							ThisType,
							Hook,
							ResType,
							Options,
							true,
							_SyncOnly
						>;
				  }
				: never
			: never)
	| HandlerHelper<ThisType, Hook, ResType, Options, false, _SyncOnly>
>;
