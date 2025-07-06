
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { CreditCard, Lock } from 'lucide-react';

// Declare Razorpay for TypeScript
declare global {
  interface Window {
    Razorpay: any;
  }
}

interface PaymentGatewayProps {
  amount: number;
  orderDetails: {
    items: any[];
    customerInfo: {
      name: string;
      email: string;
      phone: string;
    };
    shippingAddress: any;
  };
  onSuccess: (paymentData: any) => void;
  onFailure: (error: any) => void;
}

const PaymentGateway: React.FC<PaymentGatewayProps> = ({
  amount,
  orderDetails,
  onSuccess,
  onFailure
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('razorpay');

  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const initiateRazorpayPayment = async () => {
    const isScriptLoaded = await loadRazorpayScript();
    
    if (!isScriptLoaded) {
      toast.error('Failed to load payment gateway');
      return;
    }

    const options = {
      key: 'rzp_test_1234567890', // Replace with your Razorpay key
      amount: amount * 100, // Amount in paise
      currency: 'INR',
      name: 'Printy Shopsee',
      description: 'Custom Print Order',
      image: '/placeholder.svg',
      order_id: '', // You would generate this from your backend
      handler: function (response: any) {
        console.log('Payment successful:', response);
        onSuccess({
          payment_id: response.razorpay_payment_id,
          order_id: response.razorpay_order_id,
          signature: response.razorpay_signature,
          method: 'razorpay'
        });
        toast.success('Payment successful!');
      },
      prefill: {
        name: orderDetails.customerInfo.name,
        email: orderDetails.customerInfo.email,
        contact: orderDetails.customerInfo.phone
      },
      notes: {
        order_type: 'custom_print',
        items_count: orderDetails.items.length
      },
      theme: {
        color: '#3B82F6'
      },
      modal: {
        ondismiss: function() {
          setIsProcessing(false);
          toast.error('Payment cancelled');
        }
      }
    };

    const paymentObject = new window.Razorpay(options);
    
    paymentObject.on('payment.failed', function (response: any) {
      console.error('Payment failed:', response.error);
      onFailure(response.error);
      toast.error('Payment failed: ' + response.error.description);
      setIsProcessing(false);
    });

    paymentObject.open();
  };

  const handlePayment = async () => {
    if (!orderDetails.customerInfo.name || !orderDetails.customerInfo.email) {
      toast.error('Please fill in all customer details');
      return;
    }

    setIsProcessing(true);

    try {
      if (paymentMethod === 'razorpay') {
        await initiateRazorpayPayment();
      } else if (paymentMethod === 'cod') {
        // Handle Cash on Delivery
        onSuccess({
          payment_id: 'COD_' + Date.now(),
          method: 'cod',
          status: 'pending'
        });
        toast.success('Order placed successfully! Pay on delivery.');
      }
    } catch (error) {
      console.error('Payment error:', error);
      toast.error('Payment failed. Please try again.');
      onFailure(error);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <CreditCard className="h-5 w-5" />
          <span>Payment</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-gray-600">Total Amount:</span>
            <span className="text-lg font-bold">₹{amount.toLocaleString()}</span>
          </div>
          <div className="flex justify-between items-center text-sm text-gray-600">
            <span>Items: {orderDetails.items.length}</span>
            <span>Customer: {orderDetails.customerInfo.name}</span>
          </div>
        </div>

        <div className="space-y-3">
          <Label>Payment Method</Label>
          
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <input
                type="radio"
                id="razorpay"
                name="payment"
                value="razorpay"
                checked={paymentMethod === 'razorpay'}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="form-radio"
              />
              <label htmlFor="razorpay" className="flex items-center space-x-2 cursor-pointer">
                <CreditCard className="h-4 w-4" />
                <span>Credit/Debit Card, UPI, Net Banking</span>
              </label>
            </div>
            
            <div className="flex items-center space-x-2">
              <input
                type="radio"
                id="cod"
                name="payment"
                value="cod"
                checked={paymentMethod === 'cod'}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="form-radio"
              />
              <label htmlFor="cod" className="cursor-pointer">
                Cash on Delivery
              </label>
            </div>
          </div>
        </div>

        {paymentMethod === 'razorpay' && (
          <div className="bg-blue-50 p-3 rounded-lg text-sm text-blue-700">
            <div className="flex items-center space-x-1">
              <Lock className="h-4 w-4" />
              <span>Secure payment powered by Razorpay</span>
            </div>
          </div>
        )}

        <Button
          onClick={handlePayment}
          disabled={isProcessing}
          className="w-full"
          size="lg"
        >
          {isProcessing ? (
            'Processing...'
          ) : paymentMethod === 'razorpay' ? (
            `Pay ₹${amount.toLocaleString()}`
          ) : (
            'Place Order (COD)'
          )}
        </Button>

        <p className="text-xs text-gray-500 text-center">
          By proceeding, you agree to our terms and conditions
        </p>
      </CardContent>
    </Card>
  );
};

export default PaymentGateway;
