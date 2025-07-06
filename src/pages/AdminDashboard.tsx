
import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useProducts, useCreateProduct, useUpdateProduct, useDeleteProduct } from '@/hooks/useProducts';
import { useOrders } from '@/hooks/useOrders';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Package, 
  ShoppingCart, 
  Users, 
  TrendingUp,
  Upload,
  X
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

const AdminDashboard = () => {
  const { user, signOut } = useAuth();
  const { data: products = [], isLoading: productsLoading } = useProducts();
  const { data: orders = [], isLoading: ordersLoading } = useOrders();
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const deleteProduct = useDeleteProduct();

  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [productForm, setProductForm] = useState({
    name: '',
    description: '',
    category: 'Apparel',
    base_price: '',
    print_price: '',
    image_url: '',
    sizes: ['S', 'M', 'L', 'XL'],
    colors: ['White', 'Black', 'Navy', 'Red']
  });
  const [imageFile, setImageFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleImageUpload = async (file) => {
    if (!file) return null;

    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `products/${fileName}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('product-images')
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload image');
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmitProduct = async (e) => {
    e.preventDefault();
    
    let imageUrl = productForm.image_url;
    if (imageFile) {
      imageUrl = await handleImageUpload(imageFile);
      if (!imageUrl) return;
    }

    const productData = {
      ...productForm,
      base_price: parseFloat(productForm.base_price),
      print_price: parseFloat(productForm.print_price),
      image_url: imageUrl,
      mockup_images: [imageUrl],
      sizes: productForm.sizes,
      colors: productForm.colors,
      is_active: true
    };

    try {
      if (editingProduct) {
        await updateProduct.mutateAsync({ id: editingProduct.id, ...productData });
        toast.success('Product updated successfully!');
      } else {
        await createProduct.mutateAsync(productData);
        toast.success('Product created successfully!');
      }
      
      setIsProductModalOpen(false);
      resetForm();
    } catch (error) {
      toast.error('Failed to save product');
    }
  };

  const handleEditProduct = (product) => {
    setEditingProduct(product);
    setProductForm({
      name: product.name,
      description: product.description,
      category: product.category,
      base_price: product.base_price.toString(),
      print_price: product.print_price.toString(),
      image_url: product.image_url,
      sizes: product.sizes,
      colors: product.colors
    });
    setIsProductModalOpen(true);
  };

  const handleDeleteProduct = async (id) => {
    if (window.confirm('Are you sure you want to delete this product?')) {
      try {
        await deleteProduct.mutateAsync(id);
        toast.success('Product deleted successfully!');
      } catch (error) {
        toast.error('Failed to delete product');
      }
    }
  };

  const resetForm = () => {
    setEditingProduct(null);
    setImageFile(null);
    setProductForm({
      name: '',
      description: '',
      category: 'Apparel',
      base_price: '',
      print_price: '',
      image_url: '',
      sizes: ['S', 'M', 'L', 'XL'],
      colors: ['White', 'Black', 'Navy', 'Red']
    });
  };

  const addSize = (size) => {
    if (size && !productForm.sizes.includes(size)) {
      setProductForm(prev => ({
        ...prev,
        sizes: [...prev.sizes, size]
      }));
    }
  };

  const removeSize = (size) => {
    setProductForm(prev => ({
      ...prev,
      sizes: prev.sizes.filter(s => s !== size)
    }));
  };

  const addColor = (color) => {
    if (color && !productForm.colors.includes(color)) {
      setProductForm(prev => ({
        ...prev,
        colors: [...prev.colors, color]
      }));
    }
  };

  const removeColor = (color) => {
    setProductForm(prev => ({
      ...prev,
      colors: prev.colors.filter(c => c !== color)
    }));
  };

  const stats = {
    totalProducts: products.length,
    totalOrders: orders.length,
    totalRevenue: orders.reduce((sum, order) => sum + order.total_amount, 0),
    activeProducts: products.filter(p => p.is_active).length
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
              <p className="text-gray-600">Manage your Printy Shopsee store</p>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">Welcome, {user?.email}</span>
              <Button onClick={signOut} variant="outline">
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Products</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalProducts}</div>
              <p className="text-xs text-muted-foreground">
                {stats.activeProducts} active
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
              <ShoppingCart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalOrders}</div>
              <p className="text-xs text-muted-foreground">
                All time orders
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Revenue</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₹{stats.totalRevenue.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                Total earnings
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Categories</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">4</div>
              <p className="text-xs text-muted-foreground">
                Product categories
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="products" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="products">Products</TabsTrigger>
            <TabsTrigger value="orders">Orders</TabsTrigger>
          </TabsList>

          <TabsContent value="products" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Products Management</CardTitle>
                  <Dialog open={isProductModalOpen} onOpenChange={setIsProductModalOpen}>
                    <DialogTrigger asChild>
                      <Button onClick={resetForm}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Product
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>
                          {editingProduct ? 'Edit Product' : 'Add New Product'}
                        </DialogTitle>
                      </DialogHeader>
                      
                      <form onSubmit={handleSubmitProduct} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="name">Product Name</Label>
                            <Input
                              id="name"
                              value={productForm.name}
                              onChange={(e) => setProductForm(prev => ({ ...prev, name: e.target.value }))}
                              required
                            />
                          </div>
                          <div>
                            <Label htmlFor="category">Category</Label>
                            <Select 
                              value={productForm.category} 
                              onValueChange={(value) => setProductForm(prev => ({ ...prev, category: value }))}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Apparel">Apparel</SelectItem>
                                <SelectItem value="Home & Living">Home & Living</SelectItem>
                                <SelectItem value="Wall Art">Wall Art</SelectItem>
                                <SelectItem value="Accessories">Accessories</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        <div>
                          <Label htmlFor="description">Description</Label>
                          <Textarea
                            id="description"
                            value={productForm.description}
                            onChange={(e) => setProductForm(prev => ({ ...prev, description: e.target.value }))}
                            rows={3}
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="base_price">Base Price (₹)</Label>
                            <Input
                              id="base_price"
                              type="number"
                              step="0.01"
                              value={productForm.base_price}
                              onChange={(e) => setProductForm(prev => ({ ...prev, base_price: e.target.value }))}
                              required
                            />
                          </div>
                          <div>
                            <Label htmlFor="print_price">Print Price (₹)</Label>
                            <Input
                              id="print_price"
                              type="number"
                              step="0.01"
                              value={productForm.print_price}
                              onChange={(e) => setProductForm(prev => ({ ...prev, print_price: e.target.value }))}
                              required
                            />
                          </div>
                        </div>

                        <div>
                          <Label htmlFor="image">Product Image</Label>
                          <Input
                            id="image"
                            type="file"
                            accept="image/*"
                            onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                          />
                          {productForm.image_url && (
                            <img 
                              src={productForm.image_url} 
                              alt="Preview" 
                              className="mt-2 w-20 h-20 object-cover rounded"
                            />
                          )}
                        </div>

                        <div>
                          <Label>Sizes</Label>
                          <div className="flex flex-wrap gap-2 mt-2">
                            {productForm.sizes.map(size => (
                              <Badge key={size} variant="secondary" className="flex items-center gap-1">
                                {size}
                                <X 
                                  className="h-3 w-3 cursor-pointer" 
                                  onClick={() => removeSize(size)}
                                />
                              </Badge>
                            ))}
                          </div>
                          <div className="flex gap-2 mt-2">
                            <Input
                              placeholder="Add size"
                              onKeyPress={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  const target = e.target as HTMLInputElement;
                                  addSize(target.value);
                                  target.value = '';
                                }
                              }}
                            />
                          </div>
                        </div>

                        <div>
                          <Label>Colors</Label>
                          <div className="flex flex-wrap gap-2 mt-2">
                            {productForm.colors.map(color => (
                              <Badge key={color} variant="secondary" className="flex items-center gap-1">
                                {color}
                                <X 
                                  className="h-3 w-3 cursor-pointer" 
                                  onClick={() => removeColor(color)}
                                />
                              </Badge>
                            ))}
                          </div>
                          <div className="flex gap-2 mt-2">
                            <Input
                              placeholder="Add color"
                              onKeyPress={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  const target = e.target as HTMLInputElement;
                                  addColor(target.value);
                                  target.value = '';
                                }
                              }}
                            />
                          </div>
                        </div>

                        <div className="flex justify-end space-x-2">
                          <Button 
                            type="button" 
                            variant="outline" 
                            onClick={() => setIsProductModalOpen(false)}
                          >
                            Cancel
                          </Button>
                          <Button 
                            type="submit" 
                            disabled={isUploading || createProduct.isPending || updateProduct.isPending}
                          >
                            {isUploading ? 'Uploading...' : editingProduct ? 'Update' : 'Create'}
                          </Button>
                        </div>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {productsLoading ? (
                    <div className="text-center py-4">Loading products...</div>
                  ) : products.length === 0 ? (
                    <div className="text-center py-8">
                      <Package className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                      <p className="text-gray-500">No products found. Add your first product!</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {products.map((product) => (
                        <Card key={product.id}>
                          <CardContent className="p-4">
                            <img
                              src={product.image_url}
                              alt={product.name}
                              className="w-full h-48 object-cover rounded-lg mb-4"
                            />
                            <h3 className="font-semibold text-lg mb-2">{product.name}</h3>
                            <p className="text-gray-600 text-sm mb-2">{product.description}</p>
                            <div className="flex items-center justify-between mb-4">
                              <div>
                                <Badge variant="outline">{product.category}</Badge>
                                <div className="text-lg font-bold mt-1">
                                  ₹{product.base_price + product.print_price}
                                </div>
                              </div>
                              <Badge variant={product.is_active ? "default" : "secondary"}>
                                {product.is_active ? "Active" : "Inactive"}
                              </Badge>
                            </div>
                            <div className="flex space-x-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleEditProduct(product)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleDeleteProduct(product.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="orders" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Orders Management</CardTitle>
              </CardHeader>
              <CardContent>
                {ordersLoading ? (
                  <div className="text-center py-4">Loading orders...</div>
                ) : orders.length === 0 ? (
                  <div className="text-center py-8">
                    <ShoppingCart className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                    <p className="text-gray-500">No orders found.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {orders.map((order) => (
                      <Card key={order.id}>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <h3 className="font-semibold">Order #{order.order_number}</h3>
                              <p className="text-sm text-gray-600">{order.customer_name} - {order.customer_email}</p>
                              <p className="text-sm text-gray-500">
                                {new Date(order.created_at).toLocaleDateString()}
                              </p>
                            </div>
                            <div className="text-right">
                              <div className="text-lg font-bold">₹{order.total_amount}</div>
                              <div className="flex space-x-2 mt-2">
                                <Badge variant={order.status === 'completed' ? 'default' : 'secondary'}>
                                  {order.status}
                                </Badge>
                                <Badge variant={order.payment_status === 'paid' ? 'default' : 'destructive'}>
                                  {order.payment_status}
                                </Badge>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AdminDashboard;
