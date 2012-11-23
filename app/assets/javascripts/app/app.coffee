#= require_self
#= require_tree ./libs
#= require_tree ./models
#= require ./views/base.coffee
#= require_tree ./views
#= require_tree .

window.App =
  Models: {}
  Views: {}

$(document).ready(
  -> window.app = new App.Router
