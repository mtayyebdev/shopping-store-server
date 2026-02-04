import Cart from "../models/cart.model.js";
import Product from "../models/product.model.js";
import { APIError } from "../utils/apiError.js";
import { asyncHandler } from "../utils/trycatch.js";

const createCartController = asyncHandler(async (req, res) => {
  const { productId } = req.params;
  const { quantity, color, size } = req.body;

  if (!productId) {
    throw new APIError("Product not found.", 404);
  }

  if (!quantity || Number(quantity) < 1) {
    throw new APIError("Product quantity required at least 1.", 404);
  }

  const product = await Product.findById(productId).select(
    "-images -reviews -shortDesc -longDesc -specifications -sku -sold -numReviews -tags -ratings -stock",
  );

  if (!product) {
    throw new APIError("Product not found.", 404);
  }

  const totalPrice = product.price * quantity;
  const item = {
    name: product.name,
    slug: product.slug,
    price: product.price,
    oldPrice: product.oldPrice,
    quantity,
    image: product.image.url,
    brand: product.brand,
    color,
    size,
    product: product._id,
    shippingFee: product.shippingPrice,
  };

  const cart = await Cart.create({
    user: req.user._id,
    totalPrice,
    item,
    selected: false,
  });

  if (!cart) {
    throw new APIError("Something went wrong. Please try again.", 400);
  }

  return res.status(200).json({
    success: true,
    message: "Product added to your cart.",
  });
});

const deleteCartController = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!id) {
    throw new APIError("Cart Id not found.", 404);
  }

  const cart = await Cart.findOne({
    $and: [{ user: req.user._id }, { _id: id }],
  });

  if (!cart) {
    throw new APIError("Invalid cart.", 404);
  }

  await Cart.findByIdAndDelete(id);

  return res.status(200).json({
    success: true,
    message: "Cart deleted successfully.",
  });
});

const deleteManyCartsController = asyncHandler(async (req, res) => {
  const { cartsIds } = req.body;
  
  if (!Array.isArray(cartsIds) || cartsIds.length === 0) {
    throw new APIError("Please select carts to delete.");
  }

  const result = await Cart.deleteMany({
    _id: { $in: cartsIds },
  });

  if (result.deletedCount === 0) {
    throw new APIError("No carts found to delete.");
  }

  return res.status(200).json({
    success: true,
    message: `${result.deletedCount} carts deleted successfully.`,
  });
});

const updateCartController = asyncHandler(async (req, res) => {
  const { quantity } = req.body;
  const { id } = req.params;

  if (!id) {
    throw new APIError("Cart Id not found.", 404);
  }

  if (quantity < 1) {
    throw new APIError("Product quantity required at least 1.", 404);
  }

  const cart = await Cart.findById(id);

  if (!cart) {
    throw new APIError("Cart not found.", 404);
  }

  const totalprice = cart?.item?.price * quantity;
  cart.item.quantity = quantity;
  cart.totalPrice = totalprice;

  await cart.save();

  return res.status(200).json({
    success: true,
    message: "Cart updated successfully.",
  });
});

const cartsController = asyncHandler(async (req, res) => {
  const carts = await Cart.find({ user: req.user._id });

  return res.status(200).json({
    success: true,
    message: "Carts found.",
    data: carts,
  });
});

const toggleCartSelectionController = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { selected } = req.body;

  if (!id) {
    throw new APIError("Cart Id not found.", 404);
  }

  const cart = await Cart.findById(id);

  if (!cart) {
    throw new APIError("Cart not found.", 404);
  }

  cart.selected = selected;
  await cart.save();

  return res.status(200).json({
    success: true,
    message: "Cart selection updated successfully.",
  });
});

export {
  cartsController,
  deleteCartController,
  deleteManyCartsController,
  updateCartController,
  createCartController,
  toggleCartSelectionController,
};
