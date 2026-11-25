(function () {
  var runBulkPublish = function () {
    if (!window.cur_list) return;
    var selected = cur_list.get_checked_items().map(function (d) { return d.name; });
    if (!selected.length) {
      frappe.msgprint(__('Please tick at least one Item checkbox first.'));
      return;
    }
    frappe.confirm(
      __('Publish {0} selected item(s) to the Webshop?', [selected.length]),
      function () {
        frappe.call({
          method: 'promo_theme.api.bulk_publish_items_to_website',
          args: { item_codes: selected },
          freeze: true,
          freeze_message: __('Publishing {0} items to Website...', [selected.length]),
          callback: function (r) {
            var res = r.message || {};
            frappe.show_alert({
              message: __('Done: {0} created, {1} published on Website.', [res.created || 0, res.published || 0]),
              indicator: 'green'
            }, 6);
            cur_list.refresh();
          }
        });
      }
    );
  };

  var attachPublishAction = function () {
    var route = window.frappe && frappe.get_route ? frappe.get_route() : [];
    var isItemList = Array.isArray(route) && route.join('/') === 'List/Item';
    if (!isItemList || !window.cur_list || !cur_list.page || cur_list._psaPublishAdded) return;
    cur_list._psaPublishAdded = true;

    cur_list.page.add_action_item(__('Publish to Website'), runBulkPublish);
    cur_list.page.add_inner_button(__('Publish to Website'), runBulkPublish);
  };

  $(document).on('page-change', function () {
    setTimeout(attachPublishAction, 200);
    setTimeout(attachPublishAction, 700);
  });

  $(function () {
    setTimeout(attachPublishAction, 300);
    setTimeout(attachPublishAction, 1000);
  });
})();
