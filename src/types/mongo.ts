import { z } from "zod";
import mongoose from "mongoose";

export function zObjectId() {
	const objectId = () =>
		z
			.union([z.string(), z.instanceof(mongoose.Types.ObjectId)])
			.refine((val) => {
				return mongoose.Types.ObjectId.isValid(val);
			}, "invalid object id")
			.transform((val) => {
				if (val instanceof mongoose.Types.ObjectId) return val;
				return new mongoose.Types.ObjectId(val);
			});

	return z
		.union([objectId(), z.object({ _id: objectId() })])
		.transform((val) => {
			if (val instanceof mongoose.Types.ObjectId) return val;

			return val._id;
		});
}
