from app.auth.security import hash_password, verify_password

password = "test123"

hashed = hash_password(password)

print("Hash:", hashed)
print("Correct password:", verify_password(password, hashed))
print("Wrong password:", verify_password("wrong", hashed))