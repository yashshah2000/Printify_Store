-- Update the trigger function to make jainamjadu1208@gmail.com and yashkshah59@gmail.com admins
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    CASE 
      WHEN new.email = 'jainamjadu1208@gmail.com' OR new.email = 'yashkshah59@gmail.com' THEN 'admin'
      ELSE 'customer'
    END
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- If you already have a profile with this email, update it to admin role
UPDATE public.profiles 
SET role = 'admin' 
WHERE email IN ('jainamjadu1208@gmail.com', 'yashkshah59@gmail.com');
