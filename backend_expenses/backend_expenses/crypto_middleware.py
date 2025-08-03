import base64
import hashlib
import json

from Crypto.Cipher import AES
from Crypto.Util.Padding import unpad

from django.conf import settings


class PasswordDecryptionMiddleware:
    """
    Middleware para descriptografar senhas enviadas pelo frontend
    """

    def __init__(self, get_response):
        self.get_response = get_response
        self.encryption_key = getattr(settings, "ENCRYPTION_KEY", "despesa-certa-secret-key-2025")

    def decrypt_aes_password(self, encrypted_password):
        """
        Descriptografar senha usando AES (compatível com crypto-js)
        """
        try:
            encrypted_data = base64.b64decode(encrypted_password.encode("utf-8"))
        except Exception:
            return encrypted_password
        if encrypted_data.startswith(b"Salted__"):
            salt = encrypted_data[8:16]
            ciphertext = encrypted_data[16:]

            def derive_key_and_iv(password, salt, key_len, iv_len):
                d = d_i = b""
                while len(d) < (key_len + iv_len):
                    d_i = hashlib.md5(d_i + password.encode("utf-8") + salt).digest()
                    d += d_i
                key_part = d[:key_len]
                iv_part = d[key_len : key_len + iv_len]
                return key_part, iv_part

            key, iv = derive_key_and_iv(self.encryption_key, salt, 32, 16)
            cipher = AES.new(key, AES.MODE_CBC, iv)
            try:
                decrypted_bytes = cipher.decrypt(ciphertext)
                decrypted_password = unpad(decrypted_bytes, AES.block_size).decode("utf-8")
                return decrypted_password
            except Exception:
                return encrypted_password
        else:
            key = hashlib.md5(self.encryption_key.encode("utf-8")).digest()
            cipher = AES.new(key, AES.MODE_ECB)
            try:
                decrypted_bytes = cipher.decrypt(encrypted_data)
                decrypted_password = unpad(decrypted_bytes, AES.block_size).decode("utf-8")
                return decrypted_password
            except Exception:
                return encrypted_password

    def __call__(self, request):
        if request.content_type == "application/json" and request.body:
            try:
                data = json.loads(request.body)
                if data.get("encrypted") and "password" in data:
                    encrypted_password = data["password"]
                    data["password"] = self.decrypt_aes_password(encrypted_password)
                    del data["encrypted"]
                    request._body = json.dumps(data).encode("utf-8")
            except Exception:
                pass
        return self.get_response(request)
