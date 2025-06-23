import os
from flask import Flask, send_from_directory
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from flask_login import LoginManager
from df_resolve.models.models import db, User
from df_resolve.routes import denuncia_routes, auth_routes

app = Flask(__name__, static_folder="../frontend", static_url_path="/")

app.config['SECRET_KEY'] = 'secreto'

basedir = os.path.abspath(os.path.dirname(__file__))
instance_path = os.path.join(basedir, 'instance')
os.makedirs(instance_path, exist_ok=True)

db_path = os.path.join(instance_path, 'denuncias.db')
app.config['SQLALCHEMY_DATABASE_URI'] = f'sqlite:///{db_path}'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db.init_app(app)

CORS(app, supports_credentials=True, resources={
    r"/*": {"origins": "http://127.0.0.1:5500"}
})

login_manager = LoginManager()
login_manager.login_view = 'login'
login_manager.init_app(app)

@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))

app.register_blueprint(denuncia_routes.bp)
app.register_blueprint(auth_routes.bp)

@app.route("/")
def index():
    return send_from_directory(app.static_folder, 'index.html')


if __name__ == "__main__":
    with app.app_context():
        db.create_all()

        print("\nRotas disponíveis:")
        for rule in app.url_map.iter_rules():
            print(f"{rule} -> {rule.endpoint}")

    app.run(debug=True)
