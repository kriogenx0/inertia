# Runs on the default (:async, in-process) queue adapter — no Redis/Sidekiq
# needed for a single background import a user triggers occasionally. The
# token is a job argument, never written to the QuipImport row itself.
#
# Dev-mode gotcha hit while building this: adding the app/services/quip/
# directory while the Rails dev server was already running left this job's
# first-ever run raising "uninitialized constant QuipImportJob::Quip" —
# Zeitwerk's autoload paths are scanned at boot, and a brand-new top-level
# namespace directory created after that isn't picked up by the dev
# reloader's usual "reload changed files" behavior. A `bin/rails runner`
# or `bin/rails test` process (a fresh boot each time) never hit this,
# which is what made it look job/thread-specific at first. Fixed by
# restarting the server once; nothing to guard against here in code —
# production's eager loading means every constant already exists before
# any job runs, so this can't recur there.
class QuipImportJob < ApplicationJob
  queue_as :default

  def perform(quip_import_id, token)
    quip_import = QuipImport.find(quip_import_id)
    client = Quip::Client.new(token: token, domain: quip_import.domain)
    Quip::Importer.new(quip_import: quip_import, client: client).run!
  end
end
