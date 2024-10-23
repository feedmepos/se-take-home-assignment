export function createHeaders(token, type = 'user') {
  const headers = {
    headers: {
      Authorization: 'Bearer ' + token,
      'request-type': type,
    },
  };

  return headers;
}
