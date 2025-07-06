
import { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  Upload, 
  Minus, 
  Plus, 
  ZoomIn, 
  ZoomOut, 
  ShoppingCart,
  ArrowLeft,
  Palette,
  CreditCard
} from 'lucide-react';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import { useProduct } from '@/hooks/useProducts';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import PaymentGateway from '@/components/PaymentGateway';

const ProductCustomizer = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: product, isLoading } = useProduct(id || '');
  const [selectedColor, setSelectedColor] = useState('');
  const [selectedSize, setSelectedSize] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [designPosition, setDesignPosition] = useState({ x: 50, y: 40 });
  const [designSize, setDesignSize] = useState(25);
  const [customInstructions, setCustomInstructions] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [customerInfo, setCustomerInfo] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    pincode: ''
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Set default values when product loads
  useEffect(() => {
    if (product) {
      setSelectedColor(product.colors[0] || '');
      setSelectedSize(product.sizes[0] || '');
    }
  }, [product]);

  // Fallback product for direct access
  useEffect(() => {
    if (!id) {
      setSelectedColor('White');
      setSelectedSize('M');
    }
  }, [id]);

  const currentProduct = product || {
    id: 'default',
    name: 'Premium T-Shirt',
    base_price: 299,
    print_price: 100,
    image_url: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=500',
    colors: ['White', 'Black', 'Navy', 'Red'],
    sizes: ['S', 'M', 'L', 'XL', 'XXL'],
    category: 'Apparel'
  };

  const totalPrice = (currentProduct.base_price + currentProduct.print_price) * quantity;

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size should be less than 5MB');
      return;
    }

    setIsUploading(true);
    
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `custom-designs/${fileName}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(filePath, file);

      if (uploadError) {
        throw uploadError;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('product-images')
        .getPublicUrl(filePath);

      setUploadedImage(publicUrl);
      toast.success('Image uploaded successfully!');
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload image. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const adjustQuantity = (delta: number) => {
    const newQuantity = Math.max(1, quantity + delta);
    setQuantity(newQuantity);
  };

  const getColorClass = (color: string) => {
    const colorMap: { [key: string]: string } = {
      'White': 'bg-white border-2 border-gray-300',
      'Black': 'bg-black',
      'Navy': 'bg-blue-900',
      'Red': 'bg-red-600',
      'Gray': 'bg-gray-500',
      'Blue': 'bg-blue-500',
      'Clear': 'bg-transparent border-2 border-gray-300',
      'Pink': 'bg-pink-500',
      'Natural': 'bg-yellow-100 border-2 border-yellow-300',
      'Green': 'bg-green-600',
      'Yellow': 'bg-yellow-500',
      'Purple': 'bg-purple-600',
      'Orange': 'bg-orange-500'
    };
    return colorMap[color] || 'bg-gray-300';
  };

  const getProductMockup = () => {
    const categoryImages = {
      'Home & Living': 'https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=500',
      'Wall Art': 'https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?w=500',
      'Accessories': 'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=500',
      'Apparel': currentProduct.image_url
    };
    return categoryImages[currentProduct.category as keyof typeof categoryImages] || currentProduct.image_url;
  };

  const getDesignPosition = () => {
    // Adjust design position based on product category
    switch (currentProduct.category) {
      case 'Home & Living': // Mug
        return { x: 50, y: 45 }; // Center of mug
      case 'Accessories': // Phone case
        return { x: 50, y: 35 }; // Upper center of phone
      case 'Wall Art': // Canvas
        return { x: 50, y: 50 }; // Center of canvas
      default: // Apparel
        return designPosition;
    }
  };

  const proceedToPayment = () => {
    if (!uploadedImage) {
      toast.error('Please upload a design image first');
      return;
    }
    setShowPayment(true);
  };

  const handlePaymentSuccess = async (paymentData: any) => {
    try {
      // Create order in database
      const orderNumber = `PC${Date.now()}`;
      
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .insert([{
          user_id: user?.id,
          order_number: orderNumber,
          customer_email: customerInfo.email,
          customer_name: customerInfo.name,
          customer_phone: customerInfo.phone,
          shipping_address: {
            address: customerInfo.address,
            city: customerInfo.city,
            pincode: customerInfo.pincode
          },
          subtotal: totalPrice,
          total_amount: totalPrice,
          status: 'confirmed',
          payment_status: paymentData.method === 'cod' ? 'pending' : 'paid'
        }])
        .select()
        .single();

      if (orderError) throw orderError;

      // Create order items
      const { error: itemError } = await supabase
        .from('order_items')
        .insert([{
          order_id: orderData.id,
          product_id: currentProduct.id,
          quantity: quantity,
          size: selectedSize,
          color: selectedColor,
          custom_image_url: uploadedImage,
          custom_instructions: customInstructions,
          unit_price: currentProduct.base_price + currentProduct.print_price,
          total_price: totalPrice
        }]);

      if (itemError) throw itemError;

      toast.success('Order placed successfully!');
      navigate('/', { state: { orderSuccess: true, orderNumber } });
    } catch (error) {
      console.error('Order creation error:', error);
      toast.error('Failed to create order. Please contact support.');
    }
  };

  const handlePaymentFailure = (error: any) => {
    console.error('Payment failed:', error);
    toast.error('Payment failed. Please try again.');
  };

  if (isLoading && id) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link to="/">
                <Button variant="ghost" size="icon">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Product Customizer</h1>
                <p className="text-gray-600">Design your perfect custom {currentProduct.category.toLowerCase()}</p>
              </div>
            </div>
            <Badge variant="outline" className="text-lg px-4 py-2">
              Total: ₹{totalPrice}
            </Badge>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Product Preview */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Palette className="h-5 w-5" />
                  <span>Product Preview - {currentProduct.name}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="relative aspect-square bg-gray-100 rounded-lg overflow-hidden mb-4">
                  <img
                    src={getProductMockup()}
                    alt={currentProduct.name}
                    className="w-full h-full object-cover"
                  />
                  
                  {/* Design Overlay */}
                  {uploadedImage && (
                    <div
                      className="absolute pointer-events-none"
                      style={{
                        left: `${getDesignPosition().x}%`,
                        top: `${getDesignPosition().y}%`,
                        width: `${designSize}%`,
                        transform: 'translate(-50%, -50%)',
                      }}
                    >
                      <img
                        src={uploadedImage}
                        alt="Custom design"
                        className="w-full h-auto object-contain opacity-90"
                      />
                    </div>
                  )}
                </div>
                
                <div className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium">Color</Label>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {currentProduct.colors.map((color) => (
                        <button
                          key={color}
                          onClick={() => setSelectedColor(color)}
                          className={`w-8 h-8 rounded-full ${getColorClass(color)} ${
                            selectedColor === color ? 'ring-2 ring-blue-500 ring-offset-2' : ''
                          }`}
                          title={color}
                        />
                      ))}
                    </div>
                    <p className="text-sm text-gray-600 mt-1">Selected: {selectedColor}</p>
                  </div>
                  
                  <div>
                    <Label className="text-sm font-medium">Size</Label>
                    <Select value={selectedSize} onValueChange={setSelectedSize}>
                      <SelectTrigger className="mt-2">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {currentProduct.sizes.map((size) => (
                          <SelectItem key={size} value={size}>
                            {size}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Design Controls */}
            {uploadedImage && currentProduct.category === 'Apparel' && (
              <Card>
                <CardHeader>
                  <CardTitle>Design Position & Size</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm">Horizontal Position</Label>
                      <div className="flex items-center space-x-2 mt-1">
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => setDesignPosition(prev => ({ ...prev, x: Math.max(10, prev.x - 5) }))}
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                        <span className="text-sm font-mono w-12 text-center">{designPosition.x}%</span>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => setDesignPosition(prev => ({ ...prev, x: Math.min(90, prev.x + 5) }))}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    
                    <div>
                      <Label className="text-sm">Vertical Position</Label>
                      <div className="flex items-center space-x-2 mt-1">
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => setDesignPosition(prev => ({ ...prev, y: Math.max(10, prev.y - 5) }))}
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                        <span className="text-sm font-mono w-12 text-center">{designPosition.y}%</span>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => setDesignPosition(prev => ({ ...prev, y: Math.min(90, prev.y + 5) }))}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <Label className="text-sm">Design Size</Label>
                    <div className="flex items-center space-x-2 mt-1">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => setDesignSize(prev => Math.max(10, prev - 5))}
                      >
                        <ZoomOut className="h-4 w-4" />
                      </Button>
                      <span className="text-sm font-mono w-12 text-center">{designSize}%</span>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => setDesignSize(prev => Math.min(50, prev + 5))}
                      >
                        <ZoomIn className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Customization Panel */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Upload Your Design</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div
                  className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors cursor-pointer"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <p className="text-lg font-medium text-gray-700 mb-2">
                    {isUploading ? 'Uploading...' : uploadedImage ? 'Change Design' : 'Upload Your Design'}
                  </p>
                  <p className="text-sm text-gray-500">
                    PNG, JPG up to 5MB. Minimum 300x300px recommended
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                    disabled={isUploading}
                  />
                </div>
                
                {uploadedImage && (
                  <div className="text-center">
                    <p className="text-sm text-green-600 font-medium">✓ Design uploaded successfully</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Order Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="quantity">Quantity</Label>
                  <div className="flex items-center space-x-3 mt-2">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => adjustQuantity(-1)}
                      disabled={quantity <= 1}
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    <span className="text-xl font-semibold w-16 text-center">{quantity}</span>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => adjustQuantity(1)}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div>
                  <Label htmlFor="instructions">Custom Instructions (Optional)</Label>
                  <Textarea
                    id="instructions"
                    placeholder="Any special requirements or notes for your order..."
                    value={customInstructions}
                    onChange={(e) => setCustomInstructions(e.target.value)}
                    className="mt-2"
                    rows={3}
                  />
                </div>

                <div className="border-t pt-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Base Price:</span>
                      <span>₹{currentProduct.base_price}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Print Cost:</span>
                      <span>₹{currentProduct.print_price}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Quantity:</span>
                      <span>×{quantity}</span>
                    </div>
                    <div className="flex justify-between font-semibold text-lg border-t pt-2">
                      <span>Total:</span>
                      <span>₹{totalPrice}</span>
                    </div>
                  </div>
                </div>

                <Button 
                  onClick={proceedToPayment}
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white py-3"
                  size="lg"
                >
                  <CreditCard className="h-5 w-5 mr-2" />
                  Proceed to Payment
                </Button>
              </CardContent>
            </Card>

            {/* Product-specific tips */}
            <Card>
              <CardHeader>
                <CardTitle>Design Tips</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-sm text-gray-600">
                  {currentProduct.category === 'Home & Living' && (
                    <>
                      <div className="flex items-start space-x-2">
                        <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
                        <p>For mugs, designs work best on a curved surface - avoid text that's too small</p>
                      </div>
                      <div className="flex items-start space-x-2">
                        <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
                        <p>Use dishwasher-safe designs for longevity</p>
                      </div>
                    </>
                  )}
                  {currentProduct.category === 'Accessories' && (
                    <>
                      <div className="flex items-start space-x-2">
                        <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
                        <p>For phone cases, ensure designs don't cover camera or charging ports</p>
                      </div>
                      <div className="flex items-start space-x-2">
                        <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
                        <p>Consider the phone's shape when designing</p>
                      </div>
                    </>
                  )}
                  {currentProduct.category === 'Wall Art' && (
                    <>
                      <div className="flex items-start space-x-2">
                        <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
                        <p>For canvas prints, use high-resolution images (at least 1500x1500px)</p>
                      </div>
                      <div className="flex items-start space-x-2">
                        <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
                        <p>Landscape images work better for horizontal canvas sizes</p>
                      </div>
                    </>
                  )}
                  <div className="flex items-start space-x-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
                    <p>Use high-resolution images (300 DPI) for best print quality</p>
                  </div>
                  <div className="flex items-start space-x-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
                    <p>PNG files with transparent backgrounds work best</p>
                  </div>
                  <div className="flex items-start space-x-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
                    <p>Bold designs with high contrast print better</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Payment Modal */}
      <Dialog open={showPayment} onOpenChange={setShowPayment}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Complete Your Order</DialogTitle>
          </DialogHeader>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Customer Info Form */}
            <div className="space-y-4">
              <h3 className="font-semibold">Customer Information</h3>
              <div>
                <Label htmlFor="customerName">Full Name *</Label>
                <Input
                  id="customerName"
                  value={customerInfo.name}
                  onChange={(e) => setCustomerInfo(prev => ({ ...prev, name: e.target.value }))}
                  required
                />
              </div>
              <div>
                <Label htmlFor="customerEmail">Email *</Label>
                <Input
                  id="customerEmail"
                  type="email"
                  value={customerInfo.email}
                  onChange={(e) => setCustomerInfo(prev => ({ ...prev, email: e.target.value }))}
                  required
                />
              </div>
              <div>
                <Label htmlFor="customerPhone">Phone *</Label>
                <Input
                  id="customerPhone"
                  value={customerInfo.phone}
                  onChange={(e) => setCustomerInfo(prev => ({ ...prev, phone: e.target.value }))}
                  required
                />
              </div>
              <div>
                <Label htmlFor="customerAddress">Address *</Label>
                <Textarea
                  id="customerAddress"
                  value={customerInfo.address}
                  onChange={(e) => setCustomerInfo(prev => ({ ...prev, address: e.target.value }))}
                  required
                  rows={2}
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label htmlFor="customerCity">City *</Label>
                  <Input
                    id="customerCity"
                    value={customerInfo.city}
                    onChange={(e) => setCustomerInfo(prev => ({ ...prev, city: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="customerPincode">Pincode *</Label>
                  <Input
                    id="customerPincode"
                    value={customerInfo.pincode}
                    onChange={(e) => setCustomerInfo(prev => ({ ...prev, pincode: e.target.value }))}
                    required
                  />
                </div>
              </div>
            </div>

            {/* Payment Component */}
            <PaymentGateway
              amount={totalPrice}
              orderDetails={{
                items: [{
                  product: currentProduct,
                  quantity,
                  color: selectedColor,
                  size: selectedSize,
                  customImage: uploadedImage
                }],
                customerInfo,
                shippingAddress: {
                  address: customerInfo.address,
                  city: customerInfo.city,
                  pincode: customerInfo.pincode
                }
              }}
              onSuccess={handlePaymentSuccess}
              onFailure={handlePaymentFailure}
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProductCustomizer;
