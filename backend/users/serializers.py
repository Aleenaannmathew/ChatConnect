from rest_framework import serializers
from .models import User
from django.core.validators import RegexValidator
from django.contrib.auth import authenticate
from django.contrib.auth.password_validation import validate_password

class RegisterSerializer(serializers.ModelSerializer):
    username = serializers.CharField(max_length=150, validators = [RegexValidator(regex=r'^(?=.*[A-Za-z])[A-Za-z0-9_]+$', message='Username is not valid', code='invalid_username')])
    email = serializers.EmailField(required = True)
    password = serializers.CharField(write_only=True, validators=[validate_password,RegexValidator(regex=r'^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$',message='Password must be at least 8 characters long and contain one uppercase, one lowercase, one number, and one special character.')])
    confirm_password = serializers.CharField(write_only = True)

    class Meta:
        model = User
        fields = ['username', 'email', 'password', 'confirm_password']

    def validate(self, attrs):
        username = attrs.get('username')
        email = attrs.get('email')
        password = attrs.get('password')
        confirm_password = attrs.get('confirm_password')

        if User.objects.filter(username=username).exists() or User.objects.filter(email=email).exists():
            raise serializers.ValidationError("Email or username already taken.")
        
        if password != confirm_password:
            raise serializers.ValidationError({"password": "Passwords do not match."})

        return attrs

    def create(self, validated_data):
        validated_data.pop('confirm_password')  
        return User.objects.create_user(**validated_data)


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)

    def validate(self, data):
        email = data.get("email")
        password = data.get("password")

        if email and password:
            user = authenticate(email=email, password=password)
            if user:
                data["user"] = user
            else:
                raise serializers.ValidationError("Invalid email or password")
        else:
            raise serializers.ValidationError("Both email and password are required")
        return data