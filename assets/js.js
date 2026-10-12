/*
 * bllor-ngo storefront behaviour: navigation, search, donation amount pickers and the
 * donation availability window.
 */
(function ($) {
  var rtl = $("html").attr("dir") === "rtl";
  var t = function (key) {
    return (window.bllorTranslations || {})[key] || "";
  };
  var toEnglishDigits = function (value) {
    return String(value || "").replace(/[٠-٩]/g, function (d) {
      return String(d.charCodeAt(0) - 0x0660);
    });
  };

  $(function () {
    var nav = $("#main-nav");
    if (nav.length && $.fn.hcOffcanvasNav) {
      nav.removeClass("d-none");
      nav.hcOffcanvasNav({
        customToggle: $(".btn-show-offcanvas"),
        navTitle: nav.data("title"),
        levelTitles: true,
        rtl: rtl,
        position: rtl ? "right" : "left",
        levelTitleAsBack: true,
      });
    }

    $(".show-search-button").on("click", function (e) {
      e.preventDefault();
      $(".block-search-form").addClass("active");
    });

    if (window.bootstrap) {
      document.querySelectorAll('[data-bs-toggle="tooltip"]').forEach(function (el) {
        new bootstrap.Tooltip(el);
      });
    }

    initDonationWindows(document);
  });

  window.bllorInitDonationWindows = initDonationWindows;

  $(document).on("mouseup", function (e) {
    var form = $(".block-search-form");
    if (!form.is(e.target) && form.has(e.target).length === 0) form.removeClass("active");
  });

  // Unit stepper (donation_item).
  $(document).on("click", ".btn-number", function (e) {
    e.preventDefault();
    var input = $("#" + $(this).attr("data-field"));
    var value = parseInt(toEnglishDigits(input.val()), 10) || 0;
    var min = parseInt(input.attr("min"), 10) || 1;
    var max = parseInt(input.attr("max"), 10) || Infinity;
    if ($(this).attr("data-type") === "minus" && value > min) input.val(value - 1);
    if ($(this).attr("data-type") === "plus" && value < max) input.val(value + 1);
    input.trigger("change");
  });

  // Suggested amount buttons fill the amount input they point at.
  $(document).on("click", ".button-price", function () {
    var target = $(this).attr("data-target");
    $('.button-price[data-target="' + target + '"]').removeClass("active");
    $(this).addClass("active");
    $(target).val($(this).attr("data-price")).trigger("input");
  });

  // Amount inputs: Arabic digits become English, and the amount is capped at what is
  // still needed to complete the project.
  $(document).on("input", ".donation-input", function () {
    var input = $(this);
    var value = toEnglishDigits(input.val()).replace(/[^0-9]/g, "");
    var max = parseInt(input.attr("data-max"), 10);
    var message = input.closest(".block-product").find(".data-donation-remaining-amount-exceed-message");
    if (max && parseInt(value, 10) > max) {
      value = String(max);
      message.text(t("maxAmount").replace("%s", max)).addClass("show");
    } else {
      message.removeClass("show").text("");
    }
    input.val(value);
  });

  $(document).on("click", "[data-copy-url]", function () {
    navigator.clipboard.writeText($(this).attr("data-copy-url"));
    if (window.bllorCart) window.bllorCart.toast(t("copied"));
  });

  /*
   * Crowdfunding projects can have an availability window. Pages may be served from a
   * cache, so the window is evaluated in the browser, as the catalog theme did.
   */
  // The API sends "2024-03-27 10:29:00+00:00"; Safari only parses the ISO "T" form.
  function parseDate(value) {
    if (!value) return null;
    var date = new Date(String(value).replace(" ", "T"));
    return isNaN(date.getTime()) ? null : date;
  }

  function daysBetween(later, earlier) {
    return Math.floor((later - earlier) / (1000 * 3600 * 24));
  }

  function initDonationWindows(root) {
    var lang = $("html").attr("lang");
    var now = new Date();
    $(root || document).find("[data-donation-window]").each(function () {
      var label = $(this);
      var start = parseDate(label.attr("data-start"));
      var end = parseDate(label.attr("data-end"));
      var card = label.closest("[data-donation-product-id], [data-donation-page]");
      var text;
      var open = true;

      if (start && now < start) {
        var days = daysBetween(start, now);
        text = lang === "en" ? "Opportunity to donate begins after " + days + " day" : "تبدأ فرصة التبرع بعد " + days + " يوم";
        label.addClass("donation-product-message-tag-no-started");
        open = false;
      } else if (end && now > end) {
        text = lang === "en" ? "Period expired" : "انتهت مدة المشروع";
        label.addClass("donation-product-message-tag-ended");
        open = false;
      } else if (end) {
        text = (lang === "en" ? "Remaining period : " : "المدة المتبقية : ") + daysBetween(end, now) + (lang === "en" ? " day" : " يوم");
        label.addClass("donation-product-message-tag-remaining");
      } else {
        // No end date (and already started): always open.
        text = lang === "en" ? "Permanent chance" : "فرصة دائمة";
        label.addClass("donation-product-message-tag-open-permanent");
      }

      label.text(text).addClass("show");
      if (!open) {
        card.find("[data-donation-form]").remove();
        card.find("[data-donation-closed]").removeClass("d-none");
      }
    });
  }
})(jQuery);
