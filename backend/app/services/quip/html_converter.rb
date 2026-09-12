require "nokogiri"

module Quip
  # Converts a Quip thread's HTML into Tiptap-compatible ProseMirror JSON —
  # the same document shape frontend/src/pages/workspace/DocumentPage.tsx's
  # editor renders (see CustomDocument there: content must start with
  # exactly one heading, then arbitrary blocks).
  #
  # A real DOM walk (Nokogiri), not the regex approach quip-export's own
  # MarkdownWriter.swift uses for its Markdown output — regexes are fine for
  # flat text but don't handle nesting (a list inside a list item, bold
  # inside a link) as reliably as walking actual DOM nodes.
  #
  # Caveat: built and tested against synthetic HTML fixtures, not a live
  # Quip account (no API access from this environment) — Quip-specific
  # markup this doesn't recognize (checklists, @-mentions, embedded
  # spreadsheets) falls through to plain text via #fallback_inline rather
  # than being dropped, but may need adjustment once tried against real
  # export data.
  class HtmlConverter
    # image_uploader: called with (src) for each <img>, expected to return
    # the URL to use in the imported doc (the importer downloads the Quip
    # blob and re-hosts it via ActiveStorage — see Quip::Importer). Returns
    # nil to drop an image that couldn't be re-hosted.
    def initialize(image_uploader: ->(src) { src })
      @image_uploader = image_uploader
    end

    # title is used to synthesize the required leading heading, and to
    # detect (and skip) a redundant first heading in the HTML that just
    # repeats it — mirrors quip-export's own stripLeadingHeading.
    def to_tiptap_json(html, title:)
      fragment = Nokogiri::HTML5.fragment(html.to_s)
      body_nodes = fragment.children.to_a

      first_heading = body_nodes.find { |n| n.element? && n.name =~ /\Ah[1-6]\z/ }
      if first_heading && first_heading.text.strip.casecmp?(title.strip)
        body_nodes.delete(first_heading)
      end

      blocks = body_nodes.flat_map { |node| convert_block(node) }.compact

      {
        "type" => "doc",
        "content" => [ heading_node(title), *blocks ]
      }
    end

    private

    def heading_node(title)
      { "type" => "heading", "attrs" => { "level" => 1 }, "content" => text_content(title) }
    end

    def text_content(text)
      text.to_s.empty? ? [] : [ { "type" => "text", "text" => text } ]
    end

    # A block-level node -> zero or more Tiptap block nodes (usually one;
    # zero for whitespace-only text nodes; more than one only isn't needed
    # at this level since a single HTML element maps to a single JSON node).
    def convert_block(node)
      return nil if node.text? && node.text.strip.empty?
      return [ paragraph_from_inline([ node ]) ] if node.text?

      case node.name
      when "h1", "h2", "h3", "h4", "h5", "h6"
        level = [ node.name[1].to_i, 5 ].min # Heading.configure({ levels: [1..5] }) on the frontend
        { "type" => "heading", "attrs" => { "level" => level }, "content" => inline_content(node) }
      when "p", "div"
        content = inline_content(node)
        content.empty? ? nil : { "type" => "paragraph", "content" => content }
      when "ul"
        { "type" => "bulletList", "content" => node.children.select { |c| c.name == "li" }.map { |li| list_item(li) } }
      when "ol"
        { "type" => "orderedList", "content" => node.children.select { |c| c.name == "li" }.map { |li| list_item(li) } }
      when "blockquote"
        { "type" => "paragraph", "content" => inline_content(node) } # no blockquote node in this schema
      when "pre"
        { "type" => "codeBlock", "content" => text_content(node.text) }
      when "hr"
        { "type" => "horizontalRule" }
      when "img"
        image_node(node)
      when "table"
        table_node(node)
      when "br"
        nil # handled inline, see #inline_children
      else
        # Unrecognized block-level element (a div wrapper, a Quip-specific
        # widget, ...) — descend into its children rather than dropping the
        # content outright.
        node.children.flat_map { |child| convert_block(child) }.compact
      end
    end

    def list_item(li)
      blocks = li.children.flat_map { |child| convert_block(child) }.compact
      blocks = [ { "type" => "paragraph", "content" => inline_content(li) } ] if blocks.empty?
      { "type" => "listItem", "content" => blocks }
    end

    def table_node(table)
      rows = table.css("tr").map do |tr|
        cells = tr.children.select { |c| %w[td th].include?(c.name) }.map do |cell|
          {
            "type" => cell.name == "th" ? "tableHeader" : "tableCell",
            "content" => [ { "type" => "paragraph", "content" => inline_content(cell) } ]
          }
        end
        { "type" => "tableRow", "content" => cells }
      end
      return nil if rows.empty?

      { "type" => "table", "content" => rows }
    end

    def image_node(img)
      src = img["src"]
      return nil if src.blank?

      url = @image_uploader.call(src)
      return nil if url.blank?

      { "type" => "image", "attrs" => { "src" => url } }
    end

    # Wraps loose inline nodes (text sitting directly in the fragment, not
    # inside a <p>) in a paragraph.
    def paragraph_from_inline(nodes)
      content = nodes.flat_map { |n| inline_nodes(n) }.compact
      { "type" => "paragraph", "content" => content }
    end

    def inline_content(node)
      node.children.flat_map { |child| inline_nodes(child) }.compact
    end

    MARK_TAGS = {
      "strong" => "bold", "b" => "bold",
      "em" => "italic", "i" => "italic",
      "u" => "underline",
      "s" => "strike", "strike" => "strike", "del" => "strike",
      "code" => "code"
    }.freeze

    # An inline node -> zero or more Tiptap inline nodes (text/image). `marks`
    # accumulates fully-formed Tiptap mark specs (e.g. {"type" => "bold"} or
    # {"type" => "link", "attrs" => {...}}) from ancestor tags — built once
    # per tag below rather than re-derived when a text node is finally
    # reached, so a plain string-vs-hash mismatch can't creep in here.
    def inline_nodes(node, marks = [])
      if node.text?
        return [] if node.text.empty?

        return [ { "type" => "text", "text" => node.text, **(marks.empty? ? {} : { "marks" => marks }) } ]
      end

      case node.name
      when "br"
        [ { "type" => "hardBreak" } ]
      when "img"
        [ image_node(node) ].compact
      when "a"
        href = node["href"]
        link_mark = href.present? ? [ { "type" => "link", "attrs" => { "href" => href } } ] : []
        node.children.flat_map { |c| inline_nodes(c, marks + link_mark) }
      when *MARK_TAGS.keys
        node.children.flat_map { |c| inline_nodes(c, marks + [ { "type" => MARK_TAGS[node.name] } ]) }
      else
        # Unrecognized inline element — keep its text, drop the wrapper.
        node.children.flat_map { |c| inline_nodes(c, marks) }
      end
    end
  end
end
