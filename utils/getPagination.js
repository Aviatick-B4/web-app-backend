module.exports = (req, page, limit, count) => {
  let next = null
  let prev  = null;
  const endpoint = `${req.protocol}://${req.get('host')}` + req.baseUrl + req.path;

  delete req.query.page;
  delete req.query.limit;
  const searchParams = new URLSearchParams(req.query).toString();

  if (count - page*limit > 0) {
    next = `${endpoint}?page=${page + 1}&limit=${limit}`;
    if (searchParams) next += `&${searchParams}`;
  }
  
  if (page - 1 > 0) {
    prev = `${endpoint}?page=${page - 1}&limit=${limit}`;
    if (searchParams) prev += `&${searchParams}`;
  }

  return {
    next,
    prev,
    total: count
  };
}