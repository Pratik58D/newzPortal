import type { FilterQuery, Model, PopulateOptions } from "mongoose";

//taking model , filter conditions , pagination setting like: limit ,page,sort order

interface PaginateOptions {
  page?: number | string;
  limit?: number | string;
  sort?: Record<string, 1 | -1>;
  populate?: PopulateOptions | PopulateOptions[];
}

interface PaginateResult<T> {
  page: number;
  totalPages: number;
  totalItems: number;
  data: T[];
}

export const paginate = async <T>(
  model: Model<T>,
  query: FilterQuery<T> = {},
  options: PaginateOptions = {}
): Promise<PaginateResult<T>> => {
  const page = parseInt(String(options.page)) || 1;
  const limit = parseInt(String(options.limit)) || 10;
  const skip = (page - 1) * limit;

  let cursor = model
    .find(query)
    .sort(options.sort || { createdAt: -1 })
    .skip(skip)
    .limit(limit);
  if (options.populate) {
    cursor = cursor.populate(options.populate);
  }

  const [data, totalItems] = await Promise.all([
    cursor,
    model.countDocuments(query),
  ]);

  return {
    page,
    totalPages: Math.ceil(totalItems / limit),
    totalItems,
    data,
  };
};
