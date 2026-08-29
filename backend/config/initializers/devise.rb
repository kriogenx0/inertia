Devise.setup do |config|
  config.mailer_sender = "noreply@inertia.app"
  config.case_insensitive_keys = [ :email ]
  config.strip_whitespace_keys = [ :email ]
  config.skip_session_storage = [ :http_auth ]
  config.stretches = Rails.env.test? ? 1 : 12
  config.reconfirmable = false
  config.expire_all_remember_me_on_sign_out = true
  config.password_length = 6..128
  config.email_regexp = /\A[^@\s]+@[^@\s]+\z/
  config.reset_password_within = 6.hours
  config.sign_out_via = :delete
  config.navigational_formats = []

  config.jwt do |jwt|
    # Dev/test set JWT_SECRET_KEY directly (see docker-compose.yml); production
    # doesn't set that env var at all, so this falls through to the encrypted
    # credential — see config/credentials.yml.enc and this repo's README
    # "Deploy" section.
    jwt.secret = ENV.fetch("JWT_SECRET_KEY") { Rails.application.credentials.jwt_secret_key }
    jwt.dispatch_requests = [
      [ "POST", %r{^/api/v1/auth/login$} ],
      [ "POST", %r{^/api/v1/auth/signup$} ]
    ]
    jwt.revocation_requests = [ [ "DELETE", %r{^/api/v1/auth/logout$} ] ]
    jwt.expiration_time = 24.hours.to_i
  end
end
