module Quip
  # Raised when Quip rejects the token outright (401, or a 403 whose body
  # says "Not authorized") — distinct from Quip::ApiError so the importer
  # can stop the whole run immediately instead of limping through a pile of
  # per-item failures with a dead token.
  class NotAuthorizedError < StandardError; end
end
