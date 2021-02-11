up-dev:
	yarn --cwd ./src/functions build && \
	yarn --cwd ./src/web-app build && \
	pulumi --cwd ./infra up -s dev --yes