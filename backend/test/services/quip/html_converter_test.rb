require "test_helper"

class Quip::HtmlConverterTest < ActiveSupport::TestCase
  setup { @converter = Quip::HtmlConverter.new }

  test "synthesizes a leading heading from the title" do
    json = @converter.to_tiptap_json("<p>Body text.</p>", title: "My Doc")

    assert_equal "doc", json["type"]
    heading = json["content"].first
    assert_equal "heading", heading["type"]
    assert_equal 1, heading["attrs"]["level"]
    assert_equal "My Doc", heading["content"].first["text"]
  end

  test "skips a leading heading in the HTML that just repeats the title" do
    json = @converter.to_tiptap_json("<h1>My Doc</h1><p>Body text.</p>", title: "My Doc")

    # Exactly one heading (the synthesized one), not two.
    headings = json["content"].select { |n| n["type"] == "heading" }
    assert_equal 1, headings.length
    paragraph = json["content"].find { |n| n["type"] == "paragraph" }
    assert_equal "Body text.", paragraph["content"].first["text"]
  end

  test "converts bold, italic, and link marks" do
    html = %(<p>Some <b>bold</b>, <i>italic</i>, and a <a href="https://example.com">link</a>.</p>)
    json = @converter.to_tiptap_json(html, title: "T")
    paragraph = json["content"].find { |n| n["type"] == "paragraph" }

    bold_run = paragraph["content"].find { |n| n["text"] == "bold" }
    assert_equal [ { "type" => "bold" } ], bold_run["marks"]

    italic_run = paragraph["content"].find { |n| n["text"] == "italic" }
    assert_equal [ { "type" => "italic" } ], italic_run["marks"]

    link_run = paragraph["content"].find { |n| n["text"] == "link" }
    assert_equal [ { "type" => "link", "attrs" => { "href" => "https://example.com" } } ], link_run["marks"]
  end

  test "converts an unordered list to bulletList/listItem" do
    html = "<ul><li>First</li><li>Second</li></ul>"
    json = @converter.to_tiptap_json(html, title: "T")
    list = json["content"].find { |n| n["type"] == "bulletList" }

    assert_equal 2, list["content"].length
    assert_equal "listItem", list["content"].first["type"]
    first_paragraph = list["content"].first["content"].first
    assert_equal "First", first_paragraph["content"].first["text"]
  end

  test "converts an image via the injected uploader, dropping it if the uploader returns nil" do
    hosted = Quip::HtmlConverter.new(image_uploader: ->(_src) { "https://inertia.example/blob/abc" })
    json = hosted.to_tiptap_json('<img src="blob://original">', title: "T")
    image = json["content"].find { |n| n["type"] == "image" }
    assert_equal "https://inertia.example/blob/abc", image["attrs"]["src"]

    dropped = Quip::HtmlConverter.new(image_uploader: ->(_src) { nil })
    json = dropped.to_tiptap_json('<img src="blob://original">', title: "T")
    assert_nil json["content"].find { |n| n["type"] == "image" }
  end

  test "converts a table to table/tableRow/tableCell nodes" do
    html = "<table><tr><th>Name</th></tr><tr><td>Ada</td></tr></table>"
    json = @converter.to_tiptap_json(html, title: "T")
    table = json["content"].find { |n| n["type"] == "table" }

    assert_equal 2, table["content"].length
    header_cell = table["content"].first["content"].first
    assert_equal "tableHeader", header_cell["type"]
    body_cell = table["content"].second["content"].first
    assert_equal "tableCell", body_cell["type"]
  end

  test "produces a document whose first node is always a heading, even for empty HTML" do
    json = @converter.to_tiptap_json("", title: "Empty Doc")
    assert_equal "heading", json["content"].first["type"]
  end
end
