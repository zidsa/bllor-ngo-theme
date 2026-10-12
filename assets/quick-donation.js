/*
 * Quick donation widget. The amount is added as the quantity of the store's
 * system-managed "zid-quick-donation" product, then the donor goes to checkout.
 * If the product does not exist (quick donation disabled), the widget is removed.
 */
(function () {
  var container = document.querySelector("[data-quick-donation]");
  if (!container) return;

  var input = document.getElementById("qdInputAmount");
  var submit = container.querySelector(".qd-submit");
  var product = null;
  var t = function (key) {
    return (window.bllorTranslations || {})[key] || "";
  };

  document.querySelectorAll("[data-qd-toggle]").forEach(function (el) {
    el.addEventListener("click", function () {
      document.body.classList.toggle("open-quick-donation");
    });
  });

  container.querySelectorAll("#qdButsAmounts button").forEach(function (button) {
    button.addEventListener("click", function () {
      var active = container.querySelector("#qdButsAmounts button.active");
      if (active) active.classList.remove("active");
      button.classList.add("active");
      input.value = button.getAttribute("data-price");
    });
  });

  window.bllorCart
    .waitForZid()
    .then(function (zid) {
      return zid.products.get("zid-quick-donation");
    })
    .then(function (response) {
      product = (response && response.product) || response;
      if (!product || !product.id) throw new Error("missing quick donation product");
    })
    .catch(function () {
      container.remove();
      var overlay = document.querySelector(".quick-donation-overlay");
      if (overlay) overlay.remove();
    });

  submit.addEventListener("click", function () {
    var amount = parseInt(window.bllorCart.toEnglishDigits(input.value), 10);
    if (!amount || amount <= 0) {
      window.bllorCart.toast(t("enterAmount"), true);
      return;
    }
    if (!product) return;
    var html = submit.innerHTML;
    submit.disabled = true;
    submit.innerHTML = '<span class="spinner-border spinner-border-sm" role="status"></span>';
    window.bllorCart
      .addToCart(product.id, amount)
      .then(function () {
        window.location.href = "/checkout";
      })
      .catch(function () {})
      .finally(function () {
        submit.disabled = false;
        submit.innerHTML = html;
      });
  });
})();
