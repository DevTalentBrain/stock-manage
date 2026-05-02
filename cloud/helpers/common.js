const fetchAllRecords = async (query) => {
  let skip = 0;
  const limit = 100;
  let records = await query
    .skip(skip)
    .limit(limit)
    .find({ useMasterKey: true });
  let allRecords = [];

  while (records?.length > 0) {
    allRecords = allRecords.concat(records);
    skip += limit;
    records = await query.skip(skip).limit(limit).find({ useMasterKey: true });
  }

  return allRecords;
};

module.exports = {
  fetchAllRecords,
};
