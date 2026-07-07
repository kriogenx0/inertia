# syntax = docker/dockerfile:1

ARG RUBY_VERSION=3.2.4
FROM ruby:$RUBY_VERSION-slim AS base

WORKDIR /rails

ENV BUNDLE_PATH="/usr/local/bundle"


# Throw-away build stage: installs gems (all groups) and precompiles bootsnap
FROM base AS build

RUN apt-get update -qq && \
    apt-get install --no-install-recommends -y build-essential git libpq-dev pkg-config

COPY Gemfile Gemfile.lock* ./
RUN bundle install && \
    rm -rf ~/.bundle/ "${BUNDLE_PATH}"/ruby/*/cache "${BUNDLE_PATH}"/ruby/*/bundler/gems/*/.git

COPY . .

RUN bundle exec bootsnap precompile app/ lib/


# Development target: gems + code from the build stage; source is bind-mounted
# over /rails at runtime, so live edits don't require an image rebuild.
FROM build AS development

ENV RAILS_ENV="development"

EXPOSE 3000
CMD ["bin/rails", "server", "-b", "0.0.0.0"]


# Production target: reinstalls gems without dev/test groups, precompiles
# assets, and runs as a non-root user.
FROM base AS production

ENV RAILS_ENV="production" \
    BUNDLE_DEPLOYMENT="1" \
    BUNDLE_WITHOUT="development test"

RUN apt-get update -qq && \
    apt-get install --no-install-recommends -y build-essential git libpq-dev pkg-config

COPY Gemfile Gemfile.lock* ./
RUN bundle install && \
    rm -rf ~/.bundle/ "${BUNDLE_PATH}"/ruby/*/cache "${BUNDLE_PATH}"/ruby/*/bundler/gems/*/.git

COPY . .

RUN bundle exec bootsnap precompile app/ lib/
RUN SECRET_KEY_BASE_DUMMY=1 bin/rails assets:precompile

RUN apt-get purge -y --auto-remove build-essential git pkg-config && \
    apt-get install --no-install-recommends -y curl libpq5 postgresql-client && \
    rm -rf /var/lib/apt/lists /var/cache/apt/archives

RUN useradd rails --create-home --shell /bin/bash && \
    chown -R rails:rails db log storage tmp
USER rails:rails

ENTRYPOINT ["/rails/bin/docker-entrypoint"]
EXPOSE 3000
CMD ["bin/rails", "server", "-b", "0.0.0.0"]
