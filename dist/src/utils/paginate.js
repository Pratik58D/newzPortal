export const paginate = async (model, query = {}, options = {}) => {
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
//# sourceMappingURL=paginate.js.map